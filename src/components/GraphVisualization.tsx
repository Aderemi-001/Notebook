import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from '@react-force-graph/force-graph';
import { cn } from '@/lib/utils';

interface Concept {
  id: string;
  name: string;
  description: string | null;
}

interface Relationship {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  type: string;
  strength: number;
}

interface GraphVisualizationProps {
  concepts: Concept[];
  relationships: Relationship[];
  selectedConcept: Concept | null;
  onSelectConcept: (concept: Concept | null) => void;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  concepts,
  relationships,
  selectedConcept,
  onSelectConcept,
}) => {
  const graphRef = useRef<any>(); // Ref for the ForceGraph instance
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Prepare data for react-force-graph
  useEffect(() => {
    const nodes = concepts.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      fx: selectedConcept?.id === c.id ? 0 : undefined, // Fix selected node at center
      fy: selectedConcept?.id === c.id ? 0 : undefined,
    }));

    const links = relationships.map(r => ({
      id: r.id,
      source: r.source_concept_id,
      target: r.target_concept_id,
      type: r.type,
      strength: r.strength,
    }));

    setGraphData({ nodes, links });

    // Center the selected node if it exists
    if (selectedConcept && graphRef.current) {
      graphRef.current.centerAndZoom(400, 1000, selectedConcept.id);
    }
  }, [concepts, relationships, selectedConcept]);

  // Node drawing function
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isSelected = selectedConcept?.id === node.id;
    const isRelated = selectedConcept && relationships.some(rel =>
      (rel.source_concept_id === selectedConcept.id && rel.target_concept_id === node.id) ||
      (rel.target_concept_id === selectedConcept.id && rel.source_concept_id === node.id)
    );
    const isDimmed = selectedConcept && !isSelected && !isRelated;

    // Node background
    ctx.beginPath();
    ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
    ctx.fillStyle = isSelected ? 'hsl(217.2 91.2% 59.8%)' : (isDimmed ? 'rgba(100, 100, 100, 0.3)' : 'hsl(222.2 47.4% 11.2%)'); // Primary blue for selected, muted for dimmed, default primary
    ctx.fill();

    // Node border
    if (isSelected) {
      ctx.strokeStyle = 'hsl(217.2 91.2% 59.8%)'; // Primary blue
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Node text
    ctx.fillStyle = isSelected ? 'hsl(210 40% 98%)' : (isDimmed ? 'rgba(255, 255, 255, 0.5)' : 'hsl(210 40% 98%)'); // White for selected, muted for dimmed, default white
    ctx.fillText(label, node.x, node.y + 15 / globalScale); // Position text below circle

  }, [selectedConcept, relationships]);

  // Link drawing function
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;

    // ignore if link is not visible
    if (!start || !end || !start.x || !start.y || !end.x || !end.y) return;

    const isSelectedLink = selectedConcept && (
      (link.source.id === selectedConcept.id && link.target.id !== selectedConcept.id) ||
      (link.target.id === selectedConcept.id && link.source.id !== selectedConcept.id)
    );
    const isDimmed = selectedConcept && !isSelectedLink;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = isSelectedLink ? 'hsl(217.2 91.2% 59.8%)' : (isDimmed ? 'rgba(100, 100, 100, 0.2)' : 'hsl(214.3 31.8% 91.4%)'); // Primary blue for selected, muted for dimmed, default border color
    ctx.lineWidth = (link.strength * 2 + 0.5) / globalScale; // Thicker for stronger relationships
    ctx.stroke();

    // Draw arrow
    const arrowLength = 6;
    const arrowWidth = 4;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - arrowLength * Math.cos(angle - Math.PI / 6), end.y - arrowLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x - arrowLength * Math.cos(angle + Math.PI / 6), end.y - arrowLength * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = isSelectedLink ? 'hsl(217.2 91.2% 59.8%)' : (isDimmed ? 'rgba(100, 100, 100, 0.2)' : 'hsl(214.3 31.8% 91.4%)');
    ctx.fill();

  }, [selectedConcept]);

  const handleNodeClick = useCallback((node: any) => {
    onSelectConcept(node);
  }, [onSelectConcept]);

  const handleBackgroundClick = useCallback(() => {
    onSelectConcept(null);
  }, [onSelectConcept]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          enableNodeDrag={true} // Allow dragging nodes
          d3AlphaDecay={0.02} // Slower decay for more stable layout
          d3VelocityDecay={0.4} // Slower velocity decay
          linkDirectionalArrowLength={0} // Arrows drawn manually in linkCanvasObject
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.25} // Add some curvature to links
          linkLineDash={[2, 2]} // Dashed lines for links
          linkWidth="strength" // Use strength for link width
          linkAutoColorBy="type" // Color links by type
          backgroundColor="transparent" // Use parent background
          cooldownTicks={100} // Run simulation for a fixed number of ticks
          cooldownTime={10000} // Or for a fixed time
        />
      )}
    </div>
  );
};

export default GraphVisualization;