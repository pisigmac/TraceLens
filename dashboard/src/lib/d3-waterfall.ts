import * as d3 from 'd3';
import { Span } from '../types';

const AGENT_COLORS: Record<string, string> = {
  cursor: '#6366F1', // Electric Indigo
  browser_verify: '#F59E0B', // Amber Gold
  llm: '#8B5CF6', // Radiant Violet
  reviewer: '#3B82F6', // Cobalt Blue
  deploy: '#10B981', // Emerald Green
  autodev: '#EC4899', // Hot Pink
  guardloop: '#F43F5E', // Crimson Red
  default: '#00F5D4', // Cyber Teal
};

export function renderWaterfall(
  container: HTMLElement,
  spans: Span[],
  options?: { onSpanClick?: (span: Span) => void }
) {
  const width = Math.max(700, container.clientWidth || 900);
  const rowHeight = 38;
  const height = Math.max(300, spans.length * rowHeight + 70);
  const margin = { top: 35, right: 150, bottom: 40, left: 240 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  container.innerHTML = '';

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'hidden')
    .style('background', 'transparent');

  const maxLatency = d3.max(spans, d => Number(d.latency_ms) || 1) || 1;
  const x = d3.scaleLinear().domain([0, maxLatency]).range([0, innerWidth]);
  const y = d3.scaleBand()
    .domain(spans.map((_, i) => String(i)))
    .range([0, innerHeight])
    .padding(0.25);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Grid lines
  const xAxis = d3.axisBottom(x)
    .ticks(6)
    .tickSize(-innerHeight)
    .tickFormat(d => `${d}ms`);

  const gridGroup = g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis);

  gridGroup.selectAll('line')
    .attr('stroke', '#24324D')
    .attr('stroke-dasharray', '3,3');

  gridGroup.select('.domain').remove();
  gridGroup.selectAll('text')
    .attr('fill', '#94A3B8')
    .attr('font-size', '11px')
    .attr('font-family', 'JetBrains Mono, monospace');

  // Background row zebra striping
  g.selectAll('rect.row-bg')
    .data(spans)
    .join('rect')
    .attr('class', 'row-bg')
    .attr('x', -margin.left)
    .attr('y', (_, i) => y(String(i)) || 0)
    .attr('width', width)
    .attr('height', y.bandwidth())
    .attr('fill', (_, i) => i % 2 === 0 ? 'rgba(22, 31, 48, 0.4)' : 'rgba(15, 23, 42, 0.25)')
    .attr('rx', 4);

  // Main Duration Bars
  g.selectAll('rect.bar')
    .data(spans)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', (_, i) => y(String(i)) || 0)
    .attr('width', d => Math.max(8, x(Number(d.latency_ms) || 0)))
    .attr('height', y.bandwidth())
    .attr('fill', d => d.status === 'error' ? '#F43F5E' : (AGENT_COLORS[d.agent_type] || AGENT_COLORS.default))
    .attr('rx', 6)
    .attr('opacity', 0.9)
    .style('cursor', 'pointer')
    .on('click', (_event, d) => options?.onSpanClick?.(d))
    .on('mouseover', function() {
      d3.select(this)
        .attr('opacity', 1)
        .attr('stroke', '#00F5D4')
        .attr('stroke-width', 1.5);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('opacity', 0.9)
        .attr('stroke', 'none');
    });

  // Token Burn overlay (neon cyan line inside bar)
  const maxTokens = d3.max(spans, d => (Number(d.input_tokens) || 0) + (Number(d.output_tokens) || 0)) || 1;
  g.selectAll('rect.tokens')
    .data(spans)
    .join('rect')
    .attr('class', 'tokens')
    .attr('x', 0)
    .attr('y', (_, i) => (y(String(i)) || 0) + y.bandwidth() - 4)
    .attr('width', d => {
      const totalTokens = (Number(d.input_tokens) || 0) + (Number(d.output_tokens) || 0);
      return Math.max(4, x(Number(d.latency_ms) || 0) * (totalTokens / maxTokens));
    })
    .attr('height', 4)
    .attr('fill', '#00F5D4')
    .attr('rx', 2)
    .attr('opacity', 0.95);

  // Error Alert Badges
  g.selectAll('circle.error-badge')
    .data(spans.filter(d => d.status === 'error'))
    .join('circle')
    .attr('class', 'error-badge')
    .attr('cx', d => Math.max(8, x(Number(d.latency_ms) || 0)) + 12)
    .attr('cy', d => (y(String(spans.indexOf(d))) || 0) + y.bandwidth() / 2)
    .attr('r', 5)
    .attr('fill', '#F43F5E');

  // Left Labels (Agent & Tool Name)
  g.selectAll('text.label')
    .data(spans)
    .join('text')
    .attr('class', 'label')
    .attr('x', -14)
    .attr('y', (_, i) => (y(String(i)) || 0) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text(d => {
      const fullText = `${d.parent_id ? '↳ ' : ''}${d.agent_type} / ${d.tool_name}`;
      return fullText.length > 32 ? fullText.slice(0, 30) + '…' : fullText;
    })
    .attr('fill', d => d.status === 'error' ? '#F43F5E' : '#F8FAFC')
    .attr('font-size', '12px')
    .attr('font-weight', 600)
    .attr('font-family', 'Outfit, sans-serif')
    .append('title')
    .text(d => `${d.agent_type} / ${d.tool_name}`);

  // Right Metadata (Cost & Duration)
  g.selectAll('text.cost')
    .data(spans)
    .join('text')
    .attr('class', 'cost')
    .attr('x', innerWidth + 14)
    .attr('y', (_, i) => (y(String(i)) || 0) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .text(d => `$${(Number(d.cost_usd) || 0).toFixed(4)} · ${d.latency_ms}ms`)
    .attr('fill', '#94A3B8')
    .attr('font-size', '11px')
    .attr('font-family', 'JetBrains Mono, monospace');

  return svg;
}
