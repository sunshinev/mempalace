#!/usr/bin/env python3
"""
onboarding.py — MemPalace first-run setup.

Asks the user:
  1. How they're using MemPalace (work / personal / combo)
  2. Who the people in their life are (names, nicknames, relationships)
  3. What their projects are
  4. What they want their wings called

Seeds the entity_registry with confirmed data so MemPalace knows your world
from minute one — before a single session is indexed.

Usage:
    python3 -m mempalace.onboarding
    or: mempalace init
"""

from pathlib import Path
from mempalace.entity_registry import EntityRegistry
from mempalace.entity_detector import detect_entities, scan_for_detection


# ─────────────────────────────────────────────────────────────────────────────
# Default wing taxonomies by mode
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_WINGS = {
    "work": [
        "projects",
        "clients",
        "team",
        "decisions",
        "research",
    ],
    "personal": [
        "family",
        "health",
        "creative",
        "reflections",
        "relationships",
    ],
    "combo": [
        "family",
        "work",
        "health",
        "creative",
        "projects",
        "reflections",
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _hr():
    print(f"\n{'─' * 58}")


def _header(text):
    print(f"\n{'=' * 58}")
    print(f"  {text}")
    print(f"{'=' * 58}")


def _ask(prompt, default=None):
    if default:
        val = input(f"  {prompt} [{default}]: ").strip()
        return val if val else default
    return input(f"  {prompt}: ").strip()


def _yn(prompt, default="y"):
    val = input(f"  {prompt} [{'Y/n' if default == 'y' else 'y/N'}]: ").strip().lower()
    if not val:
        return default == "y"
    return val.startswith("y")


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Mode selection
# ─────────────────────────────────────────────────────────────────────────────


def _ask_mode() -> str:
    _header("Welcome to MemPalace / 欢迎使用 MemPalace")
    print("""
  MemPalace is a personal memory system. To work well, it needs to know
  a little about your world — who the people are, what the projects
  are, and how you want your memory organized.
  MemPalace 是一个个人记忆系统。为了更好地工作，它需要了解你的世界——
  你身边的人、你的项目，以及你希望如何组织记忆。

  This takes about 2 minutes. You can always update it later.
  大约需要 2 分钟。你随时可以更新。
""")
    print("  How are you using MemPalace? / 你打算如何使用 MemPalace？")
    print()
    print("    [1]  Work     — notes, projects, clients, colleagues, decisions")
    print("         工作     — 笔记、项目、客户、同事、决策")
    print("    [2]  Personal — diary, family, health, relationships, reflections")
    print("         个人     — 日记、家庭、健康、关系、反思")
    print("    [3]  Both     — personal and professional mixed")
    print("         综合     — 个人与工作混合")
    print()

    while True:
        choice = input("  Your choice / 请选择 [1/2/3]: ").strip()
        if choice == "1":
            return "work"
        elif choice == "2":
            return "personal"
        elif choice == "3":
            return "combo"
        print("  Please enter 1, 2, or 3. / 请输入 1、2 或 3。")


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: People
# ─────────────────────────────────────────────────────────────────────────────


def _ask_people(mode: str) -> tuple[list, dict]:
    """Returns (people_list, aliases_dict)."""
    people = []
    aliases = {}  # nickname → full name

    if mode in ("personal", "combo"):
        _hr()
        print("""
  Personal world — who are the important people in your life?
  个人世界——你生活中重要的人是谁？

  Format: name, relationship (e.g. "Riley, daughter" or just "Devon")
  格式：姓名, 关系（如 "小明, 儿子" 或直接写 "小红"）
  For nicknames, you'll be asked separately.
  昵称会单独询问。
  Type 'done' when finished. / 输入 'done' 完成。
""")
        while True:
            entry = input("  Person / 人物: ").strip()
            if entry.lower() in ("done", ""):
                break
            parts = [p.strip() for p in entry.split(",", 1)]
            name = parts[0]
            relationship = parts[1] if len(parts) > 1 else ""
            if name:
                # Ask about nicknames
                nick = input(
                    f"  Nickname for {name}? (or enter to skip) / {name} 的昵称？（按回车跳过）: "
                ).strip()
                if nick:
                    aliases[nick] = name
                people.append({"name": name, "relationship": relationship, "context": "personal"})

    if mode in ("work", "combo"):
        _hr()
        print("""
  Work world — who are the colleagues, clients, or collaborators
  you'd want to find in your notes?
  工作世界——你希望在笔记中找到哪些同事、客户或合作者？

  Format: name, role (e.g. "Ben, co-founder" or just "Sarah")
  格式：姓名, 角色（如 "张三, 联合创始人" 或直接写 "李四"）
  Type 'done' when finished. / 输入 'done' 完成。
""")
        while True:
            entry = input("  Person / 人物: ").strip()
            if entry.lower() in ("done", ""):
                break
            parts = [p.strip() for p in entry.split(",", 1)]
            name = parts[0]
            role = parts[1] if len(parts) > 1 else ""
            if name:
                people.append({"name": name, "relationship": role, "context": "work"})

    return people, aliases


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Projects
# ─────────────────────────────────────────────────────────────────────────────


def _ask_projects(mode: str) -> list:
    if mode == "personal":
        return []

    _hr()
    print("""
  What are your main projects? (These help MemPalace distinguish project
  names from person names — e.g. "Lantern" the project vs. "Lantern" the word.)
  你的主要项目是什么？（这帮助 MemPalace 区分项目名和人名——
  例如 "Lantern" 作为项目名 vs. "Lantern" 作为普通词。）

  Type 'done' when finished. / 输入 'done' 完成。
""")
    projects = []
    while True:
        proj = input("  Project / 项目: ").strip()
        if proj.lower() in ("done", ""):
            break
        if proj:
            projects.append(proj)
    return projects


# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Wings
# ─────────────────────────────────────────────────────────────────────────────


def _ask_wings(mode: str) -> list:
    defaults = DEFAULT_WINGS[mode]
    _hr()
    print(f"""
  Wings are the top-level categories in your memory palace.
  翼区是记忆宫殿中的顶级分类。

  Suggested wings for {mode} mode / {mode} 模式的建议翼区:
    {", ".join(defaults)}

  Press enter to keep these, or type your own comma-separated list.
  按回车保留这些，或输入你自己的逗号分隔列表。
""")
    custom = input("  Wings / 翼区: ").strip()
    if custom:
        return [w.strip() for w in custom.split(",") if w.strip()]
    return defaults


# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Auto-detect from files
# ─────────────────────────────────────────────────────────────────────────────


def _auto_detect(directory: str, known_people: list) -> list:
    """Scan directory for additional entity candidates."""
    known_names = {p["name"].lower() for p in known_people}

    try:
        files = scan_for_detection(directory)
        if not files:
            return []
        detected = detect_entities(files)
        new_people = [
            e
            for e in detected["people"]
            if e["name"].lower() not in known_names and e["confidence"] >= 0.7
        ]
        return new_people
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Ambiguity warnings
# ─────────────────────────────────────────────────────────────────────────────


def _warn_ambiguous(people: list) -> list:
    """
    Flag names that are also common English words.
    Returns list of ambiguous names for user awareness.
    """
    from mempalace.entity_registry import COMMON_ENGLISH_WORDS

    ambiguous = []
    for p in people:
        if p["name"].lower() in COMMON_ENGLISH_WORDS:
            ambiguous.append(p["name"])
    return ambiguous


# ─────────────────────────────────────────────────────────────────────────────
# Main onboarding flow
# ─────────────────────────────────────────────────────────────────────────────


def _generate_aaak_bootstrap(
    people: list, projects: list, wings: list, mode: str, config_dir: Path = None
):
    """
    Generate AAAK entity registry + critical facts bootstrap from onboarding data.
    These files teach the AI about the user's world from session one.
    """
    mempalace_dir = Path(config_dir) if config_dir else Path.home() / ".mempalace"
    mempalace_dir.mkdir(parents=True, exist_ok=True)

    # Build AAAK entity codes (first 3 letters of name, uppercase)
    entity_codes = {}
    for p in people:
        name = p["name"]
        code = name[:3].upper()
        # Handle collisions
        while code in entity_codes.values():
            code = name[:4].upper()
        entity_codes[name] = code

    # AAAK entity registry
    registry_lines = [
        "# AAAK Entity Registry",
        "# Auto-generated by mempalace init. Update as needed.",
        "",
        "## People",
    ]
    for p in people:
        name = p["name"]
        code = entity_codes[name]
        rel = p.get("relationship", "")
        registry_lines.append(f"  {code}={name} ({rel})" if rel else f"  {code}={name}")

    if projects:
        registry_lines.extend(["", "## Projects"])
        for proj in projects:
            code = proj[:4].upper()
            registry_lines.append(f"  {code}={proj}")

    registry_lines.extend(
        [
            "",
            "## AAAK Quick Reference",
            "  Symbols: ♡=love ★=importance ⚠=warning →=relationship |=separator",
            "  Structure: KEY:value | GROUP(details) | entity.attribute",
            "  Read naturally — expand codes, treat *markers* as emotional context.",
        ]
    )

    (mempalace_dir / "aaak_entities.md").write_text("\n".join(registry_lines), encoding="utf-8")

    # Critical facts bootstrap (pre-palace — before any mining)
    facts_lines = [
        "# Critical Facts (bootstrap — will be enriched after mining)",
        "",
    ]

    personal_people = [p for p in people if p.get("context") == "personal"]
    work_people = [p for p in people if p.get("context") == "work"]

    if personal_people:
        facts_lines.append("## People (personal)")
        for p in personal_people:
            code = entity_codes[p["name"]]
            rel = p.get("relationship", "")
            facts_lines.append(
                f"- **{p['name']}** ({code}) — {rel}" if rel else f"- **{p['name']}** ({code})"
            )
        facts_lines.append("")

    if work_people:
        facts_lines.append("## People (work)")
        for p in work_people:
            code = entity_codes[p["name"]]
            rel = p.get("relationship", "")
            facts_lines.append(
                f"- **{p['name']}** ({code}) — {rel}" if rel else f"- **{p['name']}** ({code})"
            )
        facts_lines.append("")

    if projects:
        facts_lines.append("## Projects")
        for proj in projects:
            facts_lines.append(f"- **{proj}**")
        facts_lines.append("")

    facts_lines.extend(
        [
            "## Palace",
            f"Wings: {', '.join(wings)}",
            f"Mode: {mode}",
            "",
            "*This file will be enriched by palace_facts.py after mining.*",
        ]
    )

    (mempalace_dir / "critical_facts.md").write_text("\n".join(facts_lines), encoding="utf-8")


def run_onboarding(
    directory: str = ".",
    config_dir: Path = None,
    auto_detect: bool = True,
) -> EntityRegistry:
    """
    Run the full onboarding flow.
    Returns the seeded EntityRegistry.
    """
    # Step 1: Mode
    mode = _ask_mode()

    # Step 2: People
    people, aliases = _ask_people(mode)

    # Step 3: Projects
    projects = _ask_projects(mode)

    # Step 4: Wings (stored in config, not registry — just show user)
    wings = _ask_wings(mode)

    # Step 5: Auto-detect additional people from files
    if auto_detect and _yn(
        "\nScan your files for additional names we might have missed?\n扫描文件以查找可能遗漏的名字？"
    ):
        directory = _ask("Directory to scan / 要扫描的目录", default=directory)
        detected = _auto_detect(directory, people)
        if detected:
            _hr()
            print(f"\n  Found {len(detected)} additional name candidates:")
            print(f"  找到 {len(detected)} 个额外的名字候选:\n")
            for e in detected:
                print(
                    f"    {e['name']:20} confidence={e['confidence']:.0%}  "
                    f"({', '.join(e['signals'][:1])})"
                )
            print()
            if _yn("  Add any of these to your registry? / 将其中一些添加到注册表中？"):
                for e in detected:
                    ans = (
                        input(f"    {e['name']} — (p)erson, (s)kip? / (p)人物, (s)跳过? ")
                        .strip()
                        .lower()
                    )
                    if ans == "p":
                        rel = input(
                            f"    Relationship/role for {e['name']}? / {e['name']} 的关系/角色？ "
                        ).strip()
                        ctx = (
                            "personal"
                            if mode == "personal"
                            else (
                                "work"
                                if mode == "work"
                                else input(
                                    "    Context — (p)ersonal or (w)ork? / 上下文——(p)个人 或 (w)工作? "
                                )
                                .strip()
                                .lower()
                                .replace("w", "work")
                                .replace("p", "personal")
                            )
                        )
                        people.append({"name": e["name"], "relationship": rel, "context": ctx})

    # Step 6: Warn about ambiguous names
    ambiguous = _warn_ambiguous(people)
    if ambiguous:
        _hr()
        print(f"""
  Heads up — these names are also common English words:
  注意——以下名字也是常见的英文单词：
    {", ".join(ambiguous)}

  MemPalace will check the context before treating them as person names.
  MemPalace 会先检查上下文再将它们视为人名。
  For example: "I picked up Riley" → person.
  例如："I picked up Riley" → 人物。
               "Have you ever tried" → adverb.
               "Have you ever tried" → 副词。
""")

    # Build and save registry
    registry = EntityRegistry.load(config_dir)
    registry.seed(mode=mode, people=people, projects=projects, aliases=aliases)

    # Generate AAAK entity registry + critical facts bootstrap
    _generate_aaak_bootstrap(people, projects, wings, mode, config_dir)

    # Summary
    _header("Setup Complete / 设置完成")
    print()
    print(f"  {registry.summary()}")
    print(f"\n  Wings / 翼区: {', '.join(wings)}")
    print(f"\n  Registry saved to / 注册表已保存至: {registry._path}")
    print("\n  AAAK entity registry / AAAK 实体注册表: ~/.mempalace/aaak_entities.md")
    print("  Critical facts bootstrap / 关键事实引导文件: ~/.mempalace/critical_facts.md")
    print("\n  Your AI will know your world from the first session.")
    print("  你的 AI 将从第一次会话起就了解你的世界。")
    print()

    return registry


# ─────────────────────────────────────────────────────────────────────────────
# Quick setup (non-interactive, for testing)
# ─────────────────────────────────────────────────────────────────────────────


def quick_setup(
    mode: str,
    people: list,
    projects: list = None,
    aliases: dict = None,
    config_dir: Path = None,
) -> EntityRegistry:
    """
    Programmatic setup without interactive prompts.
    Used in tests and benchmark scripts.

    people: list of dicts {"name": str, "relationship": str, "context": str}
    """
    registry = EntityRegistry.load(config_dir)
    registry.seed(
        mode=mode,
        people=people,
        projects=projects or [],
        aliases=aliases or {},
    )
    return registry


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    directory = sys.argv[1] if len(sys.argv) > 1 else "."
    run_onboarding(directory=directory)
