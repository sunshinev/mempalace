/**
 * kg.js — D3.js force-directed graph for MemPalace Knowledge Graph.
 *
 * Nodes: Entities (people, projects, activities, etc.)
 * Edges: Triples (subject -> predicate -> object), directed with labels
 *
 * Interactions:
 *   - Color-coded edges by predicate type
 *   - Expired facts shown as gray dashed lines
 *   - Click entity to query and expand its relationships
 *   - Search by entity name
 */

class KnowledgeGraphView {
    constructor(containerId, detailPanelId) {
        this.container = document.getElementById(containerId);
        this.detailPanel = document.getElementById(detailPanelId);
        this.width = this.container.clientWidth || 900;
        this.height = this.container.clientHeight || 600;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.predicateColors = {};
        this.colorIndex = 0;
        this.currentTransform = d3.zoomIdentity;
        this.init();
    }

    init() {
        this.svg = d3.select(`#${this.container.id}`)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.currentTransform = event.transform;
                this.g.attr('transform', event.transform);
                this.applySemanticZoom(event.transform.k);
            });
        this.svg.call(zoom);
        this.g = this.svg.append('g');

        // Arrow markers
        this.svg.append('defs').append('marker')
            .attr('id', 'kg-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#888');

        this.tooltip = d3.select('body').append('div')
            .attr('class', 'graph-tooltip')
            .style('opacity', 0);

        const resizeObserver = new ResizeObserver(() => {
            this.width = this.container.clientWidth || 900;
            this.height = this.container.clientHeight || 600;
            this.svg.attr('width', this.width).attr('height', this.height);
        });
        resizeObserver.observe(this.container);
    }

    applySemanticZoom(k) {
        const inv = 1 / k;
        // Keep node circles visually the same size
        this.g.selectAll('.kg-node circle')
            .attr('r', d => d.size * inv)
            .attr('stroke-width', 2 * inv);
        // Keep text readable
        this.g.selectAll('.kg-node text')
            .attr('font-size', (12 * inv) + 'px')
            .attr('dx', d => (d.size + 4) * inv);
        // Keep link width constant
        this.g.selectAll('.kg-link')
            .attr('stroke-width', 2 * inv);
        // Keep link labels readable
        this.g.selectAll('.kg-link-label')
            .attr('font-size', (10 * inv) + 'px');
    }

    getPredicateColor(predicate) {
        if (!this.predicateColors[predicate]) {
            this.predicateColors[predicate] = getWingColor(this.colorIndex++);
        }
        return this.predicateColors[predicate];
    }

    async load(entity = null) {
        try {
            let facts;
            if (entity) {
                const result = await API.get(`/api/kg/query?entity=${encodeURIComponent(entity)}`);
                facts = result.facts || [];
            } else {
                const result = await API.get('/api/kg/timeline');
                facts = result.timeline || [];
            }

            if (facts.length === 0) {
                this.g.selectAll('*').remove();
                this.g.append('text')
                    .attr('x', this.width / 2)
                    .attr('y', this.height / 2)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#888')
                    .attr('font-size', '16px')
                    .text(entity ? `No facts found for "${entity}"` : 'No facts in knowledge graph yet.');
                return;
            }

            this.buildFromFacts(facts);
            this.render();
        } catch (e) {
            this.container.innerHTML = `<p style="color:#e94560;padding:40px;">Error loading KG: ${esc(e.message)}</p>`;
        }
    }

    buildFromFacts(facts) {
        this.nodes = [];
        this.links = [];
        const nodeSet = new Set();

        for (const fact of facts) {
            const subj = fact.subject;
            const obj = fact.object;
            const pred = fact.predicate;
            const expired = !!fact.valid_to;

            if (!nodeSet.has(subj)) {
                nodeSet.add(subj);
                this.nodes.push({ id: subj, label: subj, type: 'entity', size: 15 });
            }
            if (!nodeSet.has(obj)) {
                nodeSet.add(obj);
                this.nodes.push({ id: obj, label: obj, type: 'entity', size: 12 });
            }

            this.links.push({
                source: subj,
                target: obj,
                predicate: pred,
                expired: expired,
                valid_from: fact.valid_from,
                valid_to: fact.valid_to,
            });
        }
    }

    render() {
        this.g.selectAll('*').remove();

        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 10));

        // Links
        const link = this.g.selectAll('.kg-link')
            .data(this.links)
            .enter().append('line')
            .attr('class', 'kg-link')
            .attr('stroke', d => d.expired ? '#555' : this.getPredicateColor(d.predicate))
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d => d.expired ? '4,4' : 'none')
            .attr('opacity', d => d.expired ? 0.4 : 0.7)
            .attr('marker-end', 'url(#kg-arrow)');

        // Link labels
        const linkLabel = this.g.selectAll('.kg-link-label')
            .data(this.links)
            .enter().append('text')
            .attr('class', 'kg-link-label')
            .text(d => d.predicate)
            .attr('fill', '#888')
            .attr('font-size', '10px')
            .attr('text-anchor', 'middle');

        // Nodes
        const node = this.g.selectAll('.kg-node')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', 'kg-node')
            .call(d3.drag()
                .on('start', (event, d) => { if (!event.active) this.simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
                .on('end', (event, d) => { if (!event.active) this.simulation.alphaTarget(0); d.fx = null; d.fy = null; })
            );

        node.append('circle')
            .attr('r', d => d.size)
            .attr('fill', '#0f3460')
            .attr('stroke', '#e94560')
            .attr('stroke-width', 2);

        node.append('text')
            .text(d => d.label)
            .attr('dx', d => d.size + 4)
            .attr('dy', 4)
            .attr('fill', '#ccc')
            .attr('font-size', '12px');

        // Hover
        node.on('mouseover', (event, d) => {
            this.tooltip.transition().duration(200).style('opacity', 0.9);
            const connections = this.links.filter(l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
            ).length;
            this.tooltip.html(`<strong>${esc(d.label)}</strong><br>Connections: ${connections}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            this.tooltip.transition().duration(500).style('opacity', 0);
        })
        .on('click', (event, d) => this.onEntityClick(d));

        // Tick
        this.simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            linkLabel.attr('x', d => (d.source.x + d.target.x) / 2)
                     .attr('y', d => (d.source.y + d.target.y) / 2);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    async onEntityClick(d) {
        if (!this.detailPanel) return;
        this.detailPanel.classList.add('open');

        try {
            const result = await API.get(`/api/kg/query?entity=${encodeURIComponent(d.id)}`);
            const facts = result.facts || [];
            let html = `
                <div class="detail-header">
                    <h3>${esc(d.label)}</h3>
                    <button class="btn-close" onclick="document.getElementById('kg-detail-panel').classList.remove('open')">&times;</button>
                </div>
                <p class="text-muted">${facts.length} fact(s)</p>
            `;
            for (const fact of facts) {
                const expired = fact.valid_to ? ' expired' : '';
                html += `<div class="fact-card${expired}">
                    <strong>${esc(fact.subject)}</strong> &rarr; ${esc(fact.predicate)} &rarr; <strong>${esc(fact.object)}</strong>
                    <br><small class="text-muted">${fact.valid_from || '?'} &mdash; ${fact.valid_to || 'present'}</small>
                    ${!fact.valid_to ? `<br><button class="btn btn-danger" style="margin-top:6px;font-size:12px;padding:4px 8px;"
                        onclick="invalidateFact('${esc(fact.subject)}','${esc(fact.predicate)}','${esc(fact.object)}', this)">Invalidate</button>` : ''}
                </div>`;
            }
            this.detailPanel.innerHTML = html;
        } catch (e) {
            this.detailPanel.innerHTML = `<p class="error">Error: ${esc(e.message)}</p>`;
        }
    }
}

/** Invalidate a KG fact from detail panel */
async function invalidateFact(subject, predicate, object, btn) {
    if (!confirm(`Invalidate: ${subject} -> ${predicate} -> ${object}?`)) return;
    try {
        await API.post('/api/kg/invalidate', { subject, predicate, object });
        btn.closest('.fact-card').classList.add('expired');
        btn.remove();
        showNotification('Fact invalidated', 'success');
    } catch (e) {
        showNotification('Failed: ' + e.message, 'error');
    }
}
