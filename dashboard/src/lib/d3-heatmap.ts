import * as d3 from 'd3';

interface HeatmapCell {
  agent_type: string;
  tool_name: string;
  failures: number;
  total: number;
}

export function renderFailureHeatmap(
  container: HTMLElement,
  data: HeatmapCell[]
) {
  const width = container.clientWidth;
  const height = 280;
  const margin = { top: 40, right: 20, bottom: 60, left: 120 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  container.innerHTML = '';

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const agents = Array.from(new Set(data.map(d => d.agent_type)));
  const tools = Array.from(new Set(data.map(d => d.tool_name)));

  const x = d3.scaleBand().domain(tools).range([0, innerWidth]).padding(0.05);
  const y = d3.scaleBand().domain(agents).range([0, innerHeight]).padding(0.05);

  const maxFailures = d3.max(data, d => d.failures) || 1;
  const color = d3.scaleSequential(d3.interpolateReds).domain([0, maxFailures]);

  g.selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', d => x(d.tool_name) || 0)
    .attr('y', d => y(d.agent_type) || 0)
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => color(d.failures))
    .attr('rx', 4);

  // Tool labels (bottom)
  g.append('g').attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll('text')
    .attr('fill', '#888888')
    .attr('font-size', '11px')
    .style('text-anchor', 'end')
    .attr('dx', '-4px')
    .attr('dy', '4px')
    .attr('transform', 'rotate(-35)');
  g.select('.domain').remove();

  // Agent labels (left)
  g.append('g').call(d3.axisLeft(y).tickSize(0))
    .selectAll('text')
    .attr('fill', '#F5F0EB')
    .attr('font-size', '12px')
    .attr('font-weight', 500);
  g.select('.domain').remove();

  // Title
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 20)
    .text('Failure Heatmap')
    .attr('fill', '#F5F0EB')
    .attr('font-size', '14px')
    .attr('font-weight', 600);
}
