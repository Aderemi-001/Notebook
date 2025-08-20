import React, { useRef, useEffect, useState } from 'react';
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

const NODE_RADIUS = 40; // Radius for concept nodes
const CONTAINER_PADDING = 50; // Padding inside the SVG container

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  concepts,
  relationships,
  selectedConcept,
  onSelectConcept,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const parent = svgRef.current.parentElement;
        if (parent) {
          setDimensions({
            width: parent.clientWidth,
            height: parent.clientHeight,
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const conceptPositions = new Map<string, { x: number; y: number }>();
  const numConcepts = concepts.length;

  if (numConcepts > 0 && dimensions.width > 0 && dimensions.height > 0) {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(centerX, centerY) - NODE_RADIUS - CONTAINER_PADDING;

    concepts.forEach((concept, i) => {
      const angle = (i / numConcepts) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      conceptPositions.set(concept.id, { x, y });
    });
  }

  const getLineCoordinates = (sourceId: string, targetId: string) => {
    const sourcePos = conceptPositions.get(sourceId);
    const targetPos = conceptPositions.get(targetId);

    if (!sourcePos || !targetPos) return null;

    // Calculate vector from source to target
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const angle = Math.atan2(dy, dx);

    // Adjust start/end points to be on the circle's edge
    const startX = sourcePos.x + NODE_RADIUS * Math.cos(angle);
    const startY = sourcePos.y + NODE_RADIUS * Math.sin(angle);
    const endX = targetPos.x - NODE_RADIUS * Math.cos(angle);
    const endY = targetPos.y - NODE_RADIUS * Math.sin(angle);

    return { x1: startX, y1: startY, x2: endX, y2: endY };
  };

  const conceptMap = new Map(concepts.map(c => [c.id, c]));

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      <svg ref={svgRef} className="absolute inset-0 w-full h-full">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-gray-400" />
          </marker>
        </defs>
        {relationships.map((rel) => {
          const coords = getLineCoordinates(rel.source_concept_id, rel.target_concept_id);
          if (!coords) return null;

          const isRelatedToSelected = selectedConcept &&
            (rel.source_concept_id === selectedConcept.id || rel.target_concept_id === selectedConcept.id);

          return (
            <line
              key={rel.id}
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
              strokeWidth={rel.strength * 3 + 1} // Thicker for stronger relationships
              className={cn(
                "transition-all duration-300",
                isRelatedToSelected ? "stroke-blue-500 opacity-100" : "stroke-gray-400 opacity-30",
                rel.type === 'is_prerequisite_for' && 'stroke-red-500', // Example: specific color for type
                rel.type === 'explains' && 'stroke-green-500'
              )}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </svg>

      {concepts.map((concept) => {
        const pos = conceptPositions.get(concept.id);
        if (!pos) return null;

        const isSelected = selectedConcept?.id === concept.id;
        const isRelated = selectedConcept && (
          relationships.some(rel =>
            (rel.source_concept_id === selectedConcept.id && rel.target_concept_id === concept.id) ||
            (rel.target_concept_id === selectedConcept.id && rel.source_concept_id === concept.id)
          )
        );

        return (
          <div
            key={concept.id}
            className={cn(
              "absolute flex items-center justify-center rounded-full text-center cursor-pointer",
              "bg-primary text-primary-foreground shadow-md transition-all duration-300",
              "hover:scale-105",
              isSelected ? "ring-4 ring-blue-500 scale-110" : "",
              selectedConcept && !isSelected && !isRelated ? "opacity-30" : "opacity-100"
            )}
            style={{
              left: pos.x - NODE_RADIUS,
              top: pos.y - NODE_RADIUS,
              width: NODE_RADIUS * 2,
              height: NODE_RADIUS * 2,
            }}
            onClick={() => onSelectConcept(concept)}
          >
            <span className="text-xs font-semibold p-1 leading-tight">
              {concept.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default GraphVisualization;