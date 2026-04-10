/**
 * graph.js — D3.js force-directed graph for MemPalace palace architecture.
 *
 * Nodes: Wings (large circles), Rooms (small circles), Drawers (rounded rects)
 * Edges: Wing-Room connections (solid), cross-wing tunnels (dashed), room-drawer (thin)
 *
 * Features:
 *   - Semantic zoom: elements stay the same screen size regardless of zoom level
 *   - Drawer expansion: click a room to expand its drawers as child nodes
 *   - Sidebar panel: shows drawer content with scroll-to-highlight
 *   - Zoom/pan with mouse wheel and drag on background
 *   - Drag individual nodes
 *   - Hover for tooltips
 */

class PalaceGraph {
    constructor(containerId, detailPanelId) {
        this.container = document.getElementById(containerId);
        this.detailPanel = document.getElementById(detailPanelId);
        this.width = this.container.clientWidth || 900;
        this.height = this.container.clientHeight || 600;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];

        // Drawer expansion state
        this.expandedRoom = null;
        this.drawerNodes = [];
        this.drawerLinks = [];

        // Current zoom scale
        this.currentK = 1;

        this.init();
    }

    init() {
        this.svg = d3.select(`#${this.container.id}`)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        // Zoom behavior — semantic zoom (no viewBox)
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.currentK = event.transform.k;
                this.g.attr('transform', event.transform);
                this.applySemanticZoom(this.currentK);
            });
        this.svg.call(this.zoom);

        this.g = this.svg.append('g');

        // Arrow marker for directed edges
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#888');

        // Tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'graph-tooltip')
            .style('opacity', 0);

        // ResizeObserver for container resize
        this._resizeObserver = new ResizeObserver(() => {
            this.width = this.container.clientWidth || 900;
            this.height = this.container.clientHeight || 600;
            this.svg
                .attr('width', this.width)
                .attr('height', this.height);
            if (this.simulation) {
                this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
                this.simulation.alpha(0.3).restart();
            }
        });
        this._resizeObserver.observe(this.container);
    }

    /**
     * Semantic zoom: adjust element sizes inversely to zoom scale
     * so they remain the same screen size regardless of zoom level.
     */
    applySemanticZoom(k) {
        const invK = 1 / k;

        // Circles (wing + room nodes)
        this.g.selectAll('circle.node-shape')
            .attr('r', d => d.size * invK)
            .attr('stroke-width', d => {
                if (d.type === 'wing') return 2 * invK;
                return 1 * invK;
            });

        // Rects (drawer nodes)
        this.g.selectAll('rect.node-shape')
            .attr('width', d => d.size * 2 * invK)
            .attr('height', d => d.size * 2 * invK)
            .attr('x', d => -d.size * invK)
            .attr('y', d => -d.size * invK)
            .attr('rx', 2 * invK)
            .attr('ry', 2 * invK)
            .attr('stroke-width', 0.5 * invK);

        // Labels
        this.g.selectAll('text.node-label')
            .attr('font-size', d => {
                if (d.type === 'wing') return (14 * invK) + 'px';
                if (d.type === 'drawer') return (9 * invK) + 'px';
                return (11 * invK) + 'px';
            })
            .attr('dx', d => (d.size + 4) * invK);

        // Links
        this.g.selectAll('line.link')
            .attr('stroke-width', d => {
                if (d.type === 'tunnel') return 2 * invK;
                if (d.type === 'drawer-link') return 0.5 * invK;
                return 1 * invK;
            });
    }

    async load() {
        try {
            const [taxonomy, graphData] = await Promise.all([
                API.get('/api/taxonomy'),
                API.get('/api/graph/stats'),
            ]);
            this.buildNodesAndLinks(taxonomy.taxonomy || taxonomy, graphData);
            this.render();
        } catch (e) {
            this.container.innerHTML = `<p style="color:#e94560;padding:40px;">Error loading palace graph: ${esc(e.message)}</p>`;
        }
    }

    buildNodesAndLinks(taxonomy, graphData) {
        this.nodes = [];
        this.links = [];
        this.wingIndex = {};
        let colorIdx = 0;

        // Create wing nodes
        for (const [wing, rooms] of Object.entries(taxonomy)) {
            const totalDrawers = Object.values(rooms).reduce((a, b) => a + b, 0);
            this.wingIndex[wing] = colorIdx;
            this.nodes.push({
                id: wing,
                label: wing,
                type: 'wing',
                size: Math.max(20, Math.min(50, 10 + totalDrawers)),
                color: getWingColor(colorIdx),
                drawers: totalDrawers,
            });
            colorIdx++;

            // Create room nodes and edges
            for (const [room, count] of Object.entries(rooms)) {
                const roomId = `${wing}::${room}`;
                this.nodes.push({
                    id: roomId,
                    label: room,
                    type: 'room',
                    wing: wing,
                    size: Math.max(6, Math.min(20, 4 + count * 2)),
                    color: getWingColor(this.wingIndex[wing]),
                    drawers: count,
                });
                this.links.push({
                    source: wing,
                    target: roomId,
                    type: 'contains',
                });
            }
        }

        // Add tunnel edges from graph data
        if (graphData.tunnels) {
            for (const tunnel of graphData.tunnels) {
                const sourceId = `${tunnel.wing_a}::${tunnel.room}`;
                const targetId = `${tunnel.wing_b}::${tunnel.room}`;
                if (this.nodes.find(n => n.id === sourceId) &&
                    this.nodes.find(n => n.id === targetId)) {
                    this.links.push({
                        source: sourceId,
                        target: targetId,
                        type: 'tunnel',
                    });
                }
            }
        }
    }

    render() {
        this.g.selectAll('*').remove();

        if (this.nodes.length === 0) {
            this.g.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#888')
                .attr('font-size', '16px')
                .text('No data in palace yet. Add drawers to see the graph.');
            return;
        }

        // Merge base nodes/links with any expanded drawer nodes/links
        const allNodes = [...this.nodes, ...this.drawerNodes];
        const allLinks = [...this.links, ...this.drawerLinks];

        // Simulation
        this.simulation = d3.forceSimulation(allNodes)
            .force('link', d3.forceLink(allLinks).id(d => d.id).distance(d => {
                if (d.type === 'tunnel') return 200;
                if (d.type === 'drawer-link') return 40;
                return 80;
            }))
            .force('charge', d3.forceManyBody().strength(d => {
                if (d.type === 'drawer') return -30;
                return -200;
            }))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 5));

        // Links
        const link = this.g.selectAll('.link')
            .data(allLinks)
            .enter().append('line')
            .attr('class', d => `link link-${d.type}`)
            .attr('stroke', d => {
                if (d.type === 'tunnel') return '#e94560';
                if (d.type === 'drawer-link') return '#666';
                return '#444';
            })
            .attr('stroke-width', d => {
                if (d.type === 'tunnel') return 2;
                if (d.type === 'drawer-link') return 0.5;
                return 1;
            })
            .attr('stroke-dasharray', d => d.type === 'tunnel' ? '5,5' : 'none')
            .attr('opacity', d => d.type === 'drawer-link' ? 0.4 : 0.6);

        // Nodes
        const node = this.g.selectAll('.node')
            .data(allNodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d))
            );

        // Render shapes by type
        // Wing nodes: circles
        node.filter(d => d.type === 'wing')
            .append('circle')
            .attr('class', 'node-shape')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.85);

        // Room nodes: circles
        node.filter(d => d.type === 'room')
            .append('circle')
            .attr('class', 'node-shape')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.85);

        // Drawer nodes: rounded rects
        node.filter(d => d.type === 'drawer')
            .append('rect')
            .attr('class', 'node-shape')
            .attr('width', d => d.size * 2)
            .attr('height', d => d.size * 2)
            .attr('x', d => -d.size)
            .attr('y', d => -d.size)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.75);

        // Labels
        node.append('text')
            .attr('class', 'node-label')
            .text(d => d.label)
            .attr('dx', d => d.size + 4)
            .attr('dy', 4)
            .attr('fill', '#ccc')
            .attr('font-size', d => {
                if (d.type === 'wing') return '14px';
                if (d.type === 'drawer') return '9px';
                return '11px';
            })
            .attr('font-weight', d => d.type === 'wing' ? 'bold' : 'normal');

        // Interactions
        node.on('mouseover', (event, d) => {
            let tooltipText = `<strong>${esc(d.label)}</strong><br>Type: ${d.type}`;
            if (d.type !== 'drawer') {
                tooltipText += `<br>Drawers: ${d.drawers}`;
            }
            this.tooltip.transition().duration(200).style('opacity', 0.9);
            this.tooltip.html(tooltipText)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            this.tooltip.transition().duration(500).style('opacity', 0);
        })
        .on('click', (event, d) => this.onNodeClick(d));

        // Tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Apply current semantic zoom level
        this.applySemanticZoom(this.currentK);
    }

    /**
     * Collapse any currently expanded room, removing its drawer nodes/links.
     */
    collapseExpanded() {
        this.expandedRoom = null;
        this.drawerNodes = [];
        this.drawerLinks = [];
    }

    /**
     * Expand a room node: fetch drawers and create child nodes around it.
     */
    async expandRoom(roomNode) {
        const wing = roomNode.wing;
        const room = roomNode.label;
        const roomId = roomNode.id;

        let drawers;
        try {
            const data = await API.get(`/api/room/drawers?wing=${encodeURIComponent(wing)}&room=${encodeURIComponent(room)}&limit=20`);
            drawers = data.drawers || data.results || [];
        } catch (e) {
            showNotification('Failed to load drawers: ' + e.message, 'error');
            return;
        }

        if (drawers.length === 0) {
            showNotification('No drawers in this room.', 'info');
            return;
        }

        this.expandedRoom = roomId;
        this.drawerNodes = [];
        this.drawerLinks = [];

        const angleStep = (2 * Math.PI) / drawers.length;
        const radius = 50;

        drawers.forEach((drawer, i) => {
            const angle = angleStep * i;
            const drawerId = `drawer::${drawer.id || i}`;
            const drawerNode = {
                id: drawerId,
                label: `D${i + 1}`,
                type: 'drawer',
                wing: wing,
                room: room,
                drawerId: drawer.id || '',
                drawerText: drawer.text || '',
                drawerFiledAt: drawer.filed_at || '',
                size: 4,
                color: getWingColor(this.wingIndex[wing] || 0),
                // Position near the room node
                x: (roomNode.x || this.width / 2) + Math.cos(angle) * radius,
                y: (roomNode.y || this.height / 2) + Math.sin(angle) * radius,
            };
            this.drawerNodes.push(drawerNode);
            this.drawerLinks.push({
                source: roomId,
                target: drawerId,
                type: 'drawer-link',
            });
        });

        // Re-render with drawer nodes included
        this.render();

        // Show sidebar
        this.showRoomDrawerPanel(wing, room, drawers);
    }

    async onNodeClick(d) {
        if (d.type === 'drawer') {
            this.showDrawerInPanel(d);
            return;
        }

        if (d.type === 'room') {
            if (this.expandedRoom === d.id) {
                // Already expanded — collapse
                this.collapseExpanded();
                this.render();
                if (this.detailPanel) {
                    this.detailPanel.classList.remove('open');
                }
            } else {
                // Collapse previous, then expand this one
                this.collapseExpanded();
                await this.expandRoom(d);
            }
            return;
        }

        // Wing clicked — show summary in sidebar
        if (!this.detailPanel) return;
        this.detailPanel.classList.add('open');
        this.detailPanel.innerHTML = `
            <div class="detail-header">
                <h3>${esc(d.label)}</h3>
                <span class="badge">Wing</span>
                <button class="btn-close" onclick="document.getElementById('detail-panel').classList.remove('open')">&times;</button>
            </div>
            <p>${d.drawers} total drawers</p>
        `;
    }

    /**
     * Show sidebar panel listing all drawers of a room.
     */
    showRoomDrawerPanel(wing, room, drawers) {
        if (!this.detailPanel) return;
        this.detailPanel.classList.add('open');

        let html = `
            <div class="detail-header">
                <h3>${esc(room)}</h3>
                <span class="badge">${esc(wing)}</span>
                <button class="btn-close" onclick="document.getElementById('detail-panel').classList.remove('open')">&times;</button>
            </div>
            <p class="text-muted">${drawers.length} drawer(s)</p>
        `;

        drawers.forEach((drawer, i) => {
            const content = drawer.text || '';
            const drawerId = drawer.id || '';
            const filedAt = drawer.filed_at || '';
            html += `<div class="drawer-card" id="sidebar-drawer-${esc(drawerId)}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <span class="badge" style="font-size:11px;">D${i + 1}</span>
                    ${filedAt ? `<small class="text-muted">${esc(filedAt)}</small>` : ''}
                </div>
                <p style="white-space:pre-wrap;margin:0 0 6px 0;">${esc(content)}</p>
                <small class="text-muted">${esc(drawerId)}</small>
                ${drawerId ? `<button class="btn btn-danger" style="margin-top:6px;font-size:12px;padding:4px 8px;" onclick="deleteDrawer('${esc(drawerId)}', this)">Delete</button>` : ''}
            </div>`;
        });

        this.detailPanel.innerHTML = html;
    }

    /**
     * Scroll to and highlight a specific drawer in the sidebar panel.
     */
    showDrawerInPanel(drawerNode) {
        if (!this.detailPanel || !drawerNode.drawerId) return;

        const el = document.getElementById(`sidebar-drawer-${drawerNode.drawerId}`);
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight for 2 seconds
        el.style.outline = '2px solid #00b4d8';
        el.style.outlineOffset = '2px';
        setTimeout(() => {
            el.style.outline = '';
            el.style.outlineOffset = '';
        }, 2000);
    }

    dragStarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

/** Delete a drawer from detail panel */
async function deleteDrawer(drawerId, btn) {
    if (!confirm('Delete this drawer?')) return;
    try {
        await API.del(`/api/drawer/${encodeURIComponent(drawerId)}`);
        btn.closest('.drawer-card').remove();
        showNotification('Drawer deleted', 'success');
    } catch (e) {
        showNotification('Delete failed: ' + e.message, 'error');
    }
}
