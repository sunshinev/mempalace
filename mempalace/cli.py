#!/usr/bin/env python3
"""
MemPalace — Give your AI a memory. No API key required.

Two ways to ingest:
  Projects:      mempalace mine ~/projects/my_app          (code, docs, notes)
  Conversations: mempalace mine ~/chats/ --mode convos     (Claude, ChatGPT, Slack)

Same palace. Same search. Different ingest strategies.

Commands:
    mempalace init <dir>                  Detect rooms from folder structure
    mempalace split <dir>                 Split concatenated mega-files into per-session files
    mempalace mine <dir>                  Mine project files (default)
    mempalace mine <dir> --mode convos    Mine conversation exports
    mempalace search "query"              Find anything, exact words
    mempalace mcp                         Show MCP setup command
    mempalace wake-up                     Show L0 + L1 wake-up context
    mempalace wake-up --wing my_app       Wake-up for a specific project
    mempalace status                      Show what's been filed

Examples:
    mempalace init ~/projects/my_app
    mempalace mine ~/projects/my_app
    mempalace mine ~/chats/claude-sessions --mode convos
    mempalace search "why did we switch to GraphQL"
    mempalace search "pricing discussion" --wing my_app --room costs
"""

import os
import sys
import shlex
import argparse
from pathlib import Path

from .config import MempalaceConfig


def cmd_init(args):
    import json
    from pathlib import Path
    from .entity_detector import scan_for_detection, detect_entities, confirm_entities
    from .room_detector_local import detect_rooms_local

    # Pass 1: auto-detect people and projects from file content
    print(f"\n  Scanning for entities in / 正在扫描实体: {args.dir}")
    files = scan_for_detection(args.dir)
    if files:
        print(f"  Reading {len(files)} files... / 正在读取 {len(files)} 个文件...")
        detected = detect_entities(files)
        total = len(detected["people"]) + len(detected["projects"]) + len(detected["uncertain"])
        if total > 0:
            confirmed = confirm_entities(detected, yes=getattr(args, "yes", False))
            # Save confirmed entities to <project>/entities.json for the miner
            if confirmed["people"] or confirmed["projects"]:
                entities_path = Path(args.dir).expanduser().resolve() / "entities.json"
                with open(entities_path, "w") as f:
                    json.dump(confirmed, f, indent=2)
                print(f"  Entities saved / 实体已保存: {entities_path}")
        else:
            print("  No entities detected — proceeding with directory-based rooms.")
            print("  未检测到实体——将基于目录结构创建房间。")

    # Pass 2: detect rooms from folder structure
    detect_rooms_local(project_dir=args.dir, yes=getattr(args, "yes", False))
    MempalaceConfig().init()


def cmd_mine(args):
    palace_path = os.path.expanduser(args.palace) if args.palace else MempalaceConfig().palace_path
    include_ignored = []
    for raw in args.include_ignored or []:
        include_ignored.extend(part.strip() for part in raw.split(",") if part.strip())

    if args.mode == "convos":
        from .convo_miner import mine_convos

        mine_convos(
            convo_dir=args.dir,
            palace_path=palace_path,
            wing=args.wing,
            agent=args.agent,
            limit=args.limit,
            dry_run=args.dry_run,
            extract_mode=args.extract,
        )
    else:
        from .miner import mine

        mine(
            project_dir=args.dir,
            palace_path=palace_path,
            wing_override=args.wing,
            agent=args.agent,
            limit=args.limit,
            dry_run=args.dry_run,
            respect_gitignore=not args.no_gitignore,
            include_ignored=include_ignored,
        )


def cmd_search(args):
    from .searcher import search, SearchError

    palace_path = os.path.expanduser(args.palace) if args.palace else MempalaceConfig().palace_path
    try:
        search(
            query=args.query,
            palace_path=palace_path,
            wing=args.wing,
            room=args.room,
            n_results=args.results,
        )
    except SearchError:
        sys.exit(1)


def cmd_wakeup(args):
    """Show L0 (identity) + L1 (essential story) — the wake-up context."""
    from .layers import MemoryStack

    palace_path = os.path.expanduser(args.palace) if args.palace else MempalaceConfig().palace_path
    stack = MemoryStack(palace_path=palace_path)

    text = stack.wake_up(wing=args.wing)
    tokens = len(text) // 4
    print(f"Wake-up text (~{tokens} tokens) / 唤醒文本（约 {tokens} 个 token）:")
    print("=" * 50)
    print(text)


def cmd_split(args):
    """Split concatenated transcript mega-files into per-session files."""
    from .split_mega_files import main as split_main
    import sys

    # Rebuild argv for split_mega_files argparse
    argv = ["--source", args.dir]
    if args.output_dir:
        argv += ["--output-dir", args.output_dir]
    if args.dry_run:
        argv.append("--dry-run")
    if args.min_sessions != 2:
        argv += ["--min-sessions", str(args.min_sessions)]

    old_argv = sys.argv
    sys.argv = ["mempalace split"] + argv
    try:
        split_main()
    finally:
        sys.argv = old_argv


def cmd_status(args):
    from .miner import status

    palace_path = os.path.expanduser(args.palace) if args.palace else MempalaceConfig().palace_path
    status(palace_path=palace_path)


def cmd_repair(args):
    """Rebuild palace vector index from SQLite metadata."""
    import chromadb
    import shutil

    palace_path = os.path.expanduser(args.palace) if args.palace else MempalaceConfig().palace_path

    if not os.path.isdir(palace_path):
        print(f"\n  No palace found at {palace_path}")
        print(f"  未找到记忆宫殿: {palace_path}")
        return

    print(f"\n{'=' * 55}")
    print("  MemPalace Repair / 记忆宫殿修复")
    print(f"{'=' * 55}\n")
    print(f"  Palace / 宫殿: {palace_path}")

    # Try to read existing drawers
    try:
        client = chromadb.PersistentClient(path=palace_path)
        col = client.get_collection("mempalace_drawers")
        total = col.count()
        print(f"  Drawers found / 已找到抽屉: {total}")
    except Exception as e:
        print(f"  Error reading palace / 读取宫殿出错: {e}")
        print("  Cannot recover — palace may need to be re-mined from source files.")
        print("  无法恢复——可能需要从源文件重新挖掘宫殿。")
        return

    if total == 0:
        print("  Nothing to repair. / 无需修复。")
        return

    # Extract all drawers in batches
    print("\n  Extracting drawers... / 正在提取抽屉...")
    batch_size = 5000
    all_ids = []
    all_docs = []
    all_metas = []
    offset = 0
    while offset < total:
        batch = col.get(limit=batch_size, offset=offset, include=["documents", "metadatas"])
        all_ids.extend(batch["ids"])
        all_docs.extend(batch["documents"])
        all_metas.extend(batch["metadatas"])
        offset += batch_size
    print(f"  Extracted {len(all_ids)} drawers / 已提取 {len(all_ids)} 个抽屉")

    # Backup and rebuild
    palace_path = palace_path.rstrip(os.sep)
    backup_path = palace_path + ".backup"
    if os.path.exists(backup_path):
        shutil.rmtree(backup_path)
    print(f"  Backing up to / 正在备份到 {backup_path}...")
    shutil.copytree(palace_path, backup_path)

    print("  Rebuilding collection... / 正在重建集合...")
    client.delete_collection("mempalace_drawers")
    new_col = client.create_collection("mempalace_drawers")

    filed = 0
    for i in range(0, len(all_ids), batch_size):
        batch_ids = all_ids[i : i + batch_size]
        batch_docs = all_docs[i : i + batch_size]
        batch_metas = all_metas[i : i + batch_size]
        new_col.add(documents=batch_docs, ids=batch_ids, metadatas=batch_metas)
        filed += len(batch_ids)
        print(
            f"  Re-filed {filed}/{len(all_ids)} drawers... / 已重新归档 {filed}/{len(all_ids)} 个抽屉..."
        )

    print(f"\n  Repair complete. {filed} drawers rebuilt.")
    print(f"  修复完成。已重建 {filed} 个抽屉。")
    print(f"  Backup saved at / 备份已保存至 {backup_path}")
    print(f"\n{'=' * 55}\n")


def cmd_hook(args):
    """Run hook logic: reads JSON from stdin, outputs JSON to stdout."""
    from .hooks_cli import run_hook

    run_hook(hook_name=args.hook, harness=args.harness)


def cmd_instructions(args):
    """Output skill instructions to stdout."""
    from .instructions_cli import run_instructions

    run_instructions(name=args.name)


def cmd_web(args):
    """Start the MemPalace Web UI server."""
    try:
        import uvicorn
    except ImportError:
        print("Web UI requires extra dependencies. Install with:")
        print("  pip install mempalace[web]")
        print("\nWeb UI 需要额外依赖。安装方式:")
        print("  pip install mempalace[web]")
        sys.exit(1)

    from .web import create_app

    palace_path = os.path.expanduser(args.palace) if args.palace else None
    app = create_app(palace_path=palace_path)

    port = args.port
    print(f"\n  MemPalace Web UI starting on http://127.0.0.1:{port}")
    print(f"  MemPalace Web UI 启动于 http://127.0.0.1:{port}")
    print("  Press Ctrl+C to stop / 按 Ctrl+C 停止\n")

    import webbrowser

    webbrowser.open(f"http://127.0.0.1:{port}")

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


def cmd_mcp(args):
    """Show how to wire MemPalace into MCP-capable hosts."""
    base_server_cmd = "python -m mempalace.mcp_server"

    if args.palace:
        resolved_palace = str(Path(args.palace).expanduser())
        server_cmd = f"{base_server_cmd} --palace {shlex.quote(resolved_palace)}"
    else:
        server_cmd = base_server_cmd

    print("MemPalace MCP quick setup / MemPalace MCP 快速设置:")
    print(f"  claude mcp add mempalace -- {server_cmd}")
    print("\nRun the server directly / 直接运行服务器:")
    print(f"  {server_cmd}")

    if not args.palace:
        print("\nOptional custom palace / 可选自定义宫殿路径:")
        print(f"  claude mcp add mempalace -- {base_server_cmd} --palace /path/to/palace")
        print(f"  {base_server_cmd} --palace /path/to/palace")


def cmd_compress(args):
    """Compress drawers in a wing using AAAK Dialect."""
    import chromadb
    from .dialect import Dialect

    palace_path = os.path.expanduser(args.palace) if args.palace else MempalaceConfig().palace_path

    # Load dialect (with optional entity config)
    config_path = args.config
    if not config_path:
        for candidate in ["entities.json", os.path.join(palace_path, "entities.json")]:
            if os.path.exists(candidate):
                config_path = candidate
                break

    if config_path and os.path.exists(config_path):
        dialect = Dialect.from_config(config_path)
        print(f"  Loaded entity config / 已加载实体配置: {config_path}")
    else:
        dialect = Dialect()

    # Connect to palace
    try:
        client = chromadb.PersistentClient(path=palace_path)
        col = client.get_collection("mempalace_drawers")
    except Exception:
        print(f"\n  No palace found at / 未找到记忆宫殿: {palace_path}")
        print("  Run: mempalace init <dir> then mempalace mine <dir>")
        print("  请运行: mempalace init <目录> 然后 mempalace mine <目录>")
        sys.exit(1)

    # Query drawers in batches to avoid SQLite variable limit (~999)
    where = {"wing": args.wing} if args.wing else None
    _BATCH = 500
    docs, metas, ids = [], [], []
    offset = 0
    while True:
        try:
            kwargs = {"include": ["documents", "metadatas"], "limit": _BATCH, "offset": offset}
            if where:
                kwargs["where"] = where
            batch = col.get(**kwargs)
        except Exception as e:
            if not docs:
                print(f"\n  Error reading drawers / 读取抽屉出错: {e}")
                sys.exit(1)
            break
        batch_docs = batch.get("documents", [])
        if not batch_docs:
            break
        docs.extend(batch_docs)
        metas.extend(batch.get("metadatas", []))
        ids.extend(batch.get("ids", []))
        offset += len(batch_docs)
        if len(batch_docs) < _BATCH:
            break

    if not docs:
        wing_label = f" in wing '{args.wing}'" if args.wing else ""
        wing_label_zh = f"在翼区 '{args.wing}' 中" if args.wing else ""
        print(f"\n  No drawers found{wing_label}. / 未找到抽屉{wing_label_zh}。")
        return

    print(
        f"\n  Compressing {len(docs)} drawers / 正在压缩 {len(docs)} 个抽屉"
        + (f" in wing '{args.wing}' / 在翼区 '{args.wing}' 中" if args.wing else "")
        + "..."
    )
    print()

    total_original = 0
    total_compressed = 0
    compressed_entries = []

    for doc, meta, doc_id in zip(docs, metas, ids):
        compressed = dialect.compress(doc, metadata=meta)
        stats = dialect.compression_stats(doc, compressed)

        total_original += stats["original_chars"]
        total_compressed += stats["compressed_chars"]

        compressed_entries.append((doc_id, compressed, meta, stats))

        if args.dry_run:
            wing_name = meta.get("wing", "?")
            room_name = meta.get("room", "?")
            source = Path(meta.get("source_file", "?")).name
            print(f"  [{wing_name}/{room_name}] {source}")
            print(
                f"    {stats['original_tokens']}t -> {stats['compressed_tokens']}t ({stats['ratio']:.1f}x)"
            )
            print(f"    {compressed}")
            print()

    # Store compressed versions (unless dry-run)
    if not args.dry_run:
        try:
            comp_col = client.get_or_create_collection("mempalace_compressed")
            for doc_id, compressed, meta, stats in compressed_entries:
                comp_meta = dict(meta)
                comp_meta["compression_ratio"] = round(stats["ratio"], 1)
                comp_meta["original_tokens"] = stats["original_tokens"]
                comp_col.upsert(
                    ids=[doc_id],
                    documents=[compressed],
                    metadatas=[comp_meta],
                )
            print(
                f"  Stored {len(compressed_entries)} compressed drawers in 'mempalace_compressed' collection."
            )
            print(
                f"  已将 {len(compressed_entries)} 个压缩抽屉存储到 'mempalace_compressed' 集合中。"
            )
        except Exception as e:
            print(f"  Error storing compressed drawers / 存储压缩抽屉出错: {e}")
            sys.exit(1)

    # Summary
    ratio = total_original / max(total_compressed, 1)
    orig_tokens = Dialect.count_tokens("x" * total_original)
    comp_tokens = Dialect.count_tokens("x" * total_compressed)
    print(f"  Total / 总计: {orig_tokens:,}t -> {comp_tokens:,}t ({ratio:.1f}x compression / 压缩)")
    if args.dry_run:
        print("  (dry run -- nothing stored) / （试运行——未存储任何内容）")


def main():
    parser = argparse.ArgumentParser(
        description="MemPalace — Give your AI a memory. No API key required.\nMemPalace — 赋予你的 AI 记忆。无需 API 密钥。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--palace",
        default=None,
        help="Where the palace lives (default: from ~/.mempalace/config.json or ~/.mempalace/palace) / 宫殿存储位置（默认: ~/.mempalace/config.json 或 ~/.mempalace/palace）",
    )

    sub = parser.add_subparsers(dest="command")

    # init
    p_init = sub.add_parser(
        "init", help="Detect rooms from your folder structure / 从文件夹结构检测房间"
    )
    p_init.add_argument("dir", help="Project directory to set up / 要设置的项目目录")
    p_init.add_argument(
        "--yes",
        action="store_true",
        help="Auto-accept all detected entities (non-interactive) / 自动接受所有检测到的实体（非交互模式）",
    )

    # mine
    p_mine = sub.add_parser("mine", help="Mine files into the palace / 将文件挖掘到宫殿中")
    p_mine.add_argument("dir", help="Directory to mine / 要挖掘的目录")
    p_mine.add_argument(
        "--mode",
        choices=["projects", "convos"],
        default="projects",
        help="Ingest mode: 'projects' for code/docs (default), 'convos' for chat exports / 摄入模式：'projects' 用于代码/文档（默认），'convos' 用于聊天导出",
    )
    p_mine.add_argument(
        "--wing",
        default=None,
        help="Wing name (default: directory name) / 翼区名称（默认：目录名）",
    )
    p_mine.add_argument(
        "--no-gitignore",
        action="store_true",
        help="Don't respect .gitignore files when scanning project files / 扫描项目文件时不遵守 .gitignore 规则",
    )
    p_mine.add_argument(
        "--include-ignored",
        action="append",
        default=[],
        help="Always scan these project-relative paths even if ignored; repeat or pass comma-separated paths / 始终扫描这些项目相对路径（即使被忽略）；可重复使用或传入逗号分隔的路径",
    )
    p_mine.add_argument(
        "--agent",
        default="mempalace",
        help="Your name — recorded on every drawer (default: mempalace) / 你的名字——记录在每个抽屉上（默认：mempalace）",
    )
    p_mine.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max files to process (0 = all) / 最大处理文件数（0 = 全部）",
    )
    p_mine.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be filed without filing / 显示将归档的内容但不实际归档",
    )
    p_mine.add_argument(
        "--extract",
        choices=["exchange", "general"],
        default="exchange",
        help="Extraction strategy for convos mode: 'exchange' (default) or 'general' (5 memory types) / 对话模式的提取策略：'exchange'（默认）或 'general'（5种记忆类型）",
    )

    # search
    p_search = sub.add_parser("search", help="Find anything, exact words / 搜索任何内容，精确匹配")
    p_search.add_argument("query", help="What to search for / 要搜索的内容")
    p_search.add_argument("--wing", default=None, help="Limit to one project / 限制为单个项目")
    p_search.add_argument("--room", default=None, help="Limit to one room / 限制为单个房间")
    p_search.add_argument("--results", type=int, default=5, help="Number of results / 结果数量")

    # compress
    p_compress = sub.add_parser(
        "compress",
        help="Compress drawers using AAAK Dialect (~30x reduction) / 使用 AAAK 方言压缩抽屉（约30倍压缩）",
    )
    p_compress.add_argument(
        "--wing",
        default=None,
        help="Wing to compress (default: all wings) / 要压缩的翼区（默认：所有翼区）",
    )
    p_compress.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview compression without storing / 预览压缩结果但不存储",
    )
    p_compress.add_argument(
        "--config",
        default=None,
        help="Entity config JSON (e.g. entities.json) / 实体配置 JSON 文件（如 entities.json）",
    )

    # wake-up
    p_wakeup = sub.add_parser(
        "wake-up",
        help="Show L0 + L1 wake-up context (~600-900 tokens) / 显示 L0 + L1 唤醒上下文（约600-900 token）",
    )
    p_wakeup.add_argument(
        "--wing", default=None, help="Wake-up for a specific project/wing / 针对特定项目/翼区的唤醒"
    )

    # split
    p_split = sub.add_parser(
        "split",
        help="Split concatenated transcript mega-files into per-session files (run before mine) / 将合并的大型转录文件拆分为每个会话的文件（在 mine 之前运行）",
    )
    p_split.add_argument("dir", help="Directory containing transcript files / 包含转录文件的目录")
    p_split.add_argument(
        "--output-dir",
        default=None,
        help="Write split files here (default: same directory as source files) / 将拆分文件写入此处（默认：与源文件相同的目录）",
    )
    p_split.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be split without writing files / 显示将被拆分的内容但不写入文件",
    )
    p_split.add_argument(
        "--min-sessions",
        type=int,
        default=2,
        help="Only split files containing at least N sessions (default: 2) / 仅拆分包含至少 N 个会话的文件（默认：2）",
    )

    # hook
    p_hook = sub.add_parser(
        "hook",
        help="Run hook logic (reads JSON from stdin, outputs JSON to stdout) / 运行钩子逻辑（从 stdin 读取 JSON，输出 JSON 到 stdout）",
    )
    hook_sub = p_hook.add_subparsers(dest="hook_action")
    p_hook_run = hook_sub.add_parser("run", help="Execute a hook / 执行钩子")
    p_hook_run.add_argument(
        "--hook",
        required=True,
        choices=["session-start", "stop", "precompact"],
        help="Hook name to run / 要运行的钩子名称",
    )
    p_hook_run.add_argument(
        "--harness",
        required=True,
        choices=["claude-code", "codex"],
        help="Harness type (determines stdin JSON format) / 工具类型（决定 stdin JSON 格式）",
    )

    # instructions
    p_instructions = sub.add_parser(
        "instructions",
        help="Output skill instructions to stdout / 将技能指令输出到 stdout",
    )
    instructions_sub = p_instructions.add_subparsers(dest="instructions_name")
    for instr_name in ["init", "search", "mine", "help", "status"]:
        instructions_sub.add_parser(
            instr_name, help=f"Output {instr_name} instructions / 输出 {instr_name} 指令"
        )

    # repair
    sub.add_parser(
        "repair",
        help="Rebuild palace vector index from stored data (fixes segfaults after corruption) / 从存储数据重建宫殿向量索引（修复损坏后的段错误）",
    )

    # mcp
    sub.add_parser(
        "mcp",
        help="Show MCP setup command for connecting MemPalace to your AI client / 显示将 MemPalace 连接到 AI 客户端的 MCP 设置命令",
    )

    # web
    p_web = sub.add_parser(
        "web",
        help="Start the Web UI for visualizing and managing your palace / 启动 Web UI 可视化管理宫殿",
    )
    p_web.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port to listen on (default: 8765) / 监听端口（默认: 8765）",
    )
    p_web.add_argument(
        "--palace",
        metavar="PATH",
        help="Path to the palace directory / 宫殿目录路径",
    )

    # status
    sub.add_parser("status", help="Show what's been filed / 显示已归档的内容")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Handle two-level subcommands
    if args.command == "hook":
        if not getattr(args, "hook_action", None):
            p_hook.print_help()
            return
        cmd_hook(args)
        return

    if args.command == "instructions":
        name = getattr(args, "instructions_name", None)
        if not name:
            p_instructions.print_help()
            return
        args.name = name
        cmd_instructions(args)
        return

    dispatch = {
        "init": cmd_init,
        "mine": cmd_mine,
        "split": cmd_split,
        "search": cmd_search,
        "mcp": cmd_mcp,
        "web": cmd_web,
        "compress": cmd_compress,
        "wake-up": cmd_wakeup,
        "repair": cmd_repair,
        "status": cmd_status,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
