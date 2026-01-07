import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

interface GraphNode {
    id: string;
    count: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    freshness: number;
}

interface GraphLink {
    source: string;
    target: string;
    strength: number;
}

interface ConstellationGraphProps {
    nodes: { id: string; count: number; relatedTags: string[]; freshness: number }[];
    onSelectNode: (nodeId: string) => void;
    selectedNodeId: string | null;
}

export const ConstellationGraph: React.FC<ConstellationGraphProps> = ({
    nodes: rawNodes,
    onSelectNode,
    selectedNodeId
}: ConstellationGraphProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [links, setLinks] = useState<GraphLink[]>([]);
    const animationRef = useRef<number>();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [draggingNode, setDraggingNode] = useState<string | null>(null);

    // Initialize Graph Data derived from props
    useEffect(() => {
        if (!containerRef.current || rawNodes.length === 0) return;

        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });

        // Initialize positions randomly but centered
        const newNodes: GraphNode[] = rawNodes.map((n: ConstellationGraphProps['nodes'][0]) => ({
            id: n.id,
            count: n.count,
            x: clientWidth / 2 + (Math.random() - 0.5) * 200,
            y: clientHeight / 2 + (Math.random() - 0.5) * 200,
            vx: 0,
            vy: 0,
            freshness: n.freshness
        }));

        // Create unique links
        const linkSet = new Set<string>();
        const newLinks: GraphLink[] = [];

        rawNodes.forEach((node: ConstellationGraphProps['nodes'][0]) => {
            node.relatedTags.forEach((targetId: string) => {
                // Ensure both nodes exist in our current set (filtering consistency)
                if (rawNodes.find((n: ConstellationGraphProps['nodes'][0]) => n.id === targetId)) {
                    const linkId = [node.id, targetId].sort().join('-');
                    if (!linkSet.has(linkId)) {
                        linkSet.add(linkId);
                        newLinks.push({ source: node.id, target: targetId, strength: 1 });
                    }
                }
            });
        });

        setNodes(newNodes);
        setLinks(newLinks);

    }, [rawNodes]);

    // Physics Simulation Loop
    useEffect(() => {
        if (nodes.length === 0) return;

        const tick = () => {
            setNodes(prevNodes => {
                const nextNodes = prevNodes.map(n => ({ ...n }));
                const width = dimensions.width;
                const height = dimensions.height;

                // Constants
                const REPULSION = 3000; // Adjusted for balance
                const SPRING_LENGTH = 100; // Shorter springs to keep related items closer but distinct
                const SPRING_K = 0.02; // Soft springs
                const CENTER_GRAVITY = 0.005; // Very weak gravity to allow spreading
                const DAMPING = 0.9; // Less friction for fluid movement

                // 1. Repulsion (Nodes push apart)
                for (let i = 0; i < nextNodes.length; i++) {
                    for (let j = i + 1; j < nextNodes.length; j++) {
                        const a = nextNodes[i];
                        const b = nextNodes[j];
                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        const distSq = dx * dx + dy * dy || 1;
                        const dist = Math.sqrt(distSq);

                        // Prevent division by zero and extreme forces
                        if (dist < 1) continue;

                        const force = REPULSION / (distSq + 500);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        a.vx += fx;
                        a.vy += fy;
                        b.vx -= fx;
                        b.vy -= fy;
                    }
                }

                // 2. Attraction (Links pull together)
                links.forEach(link => {
                    const source = nextNodes.find(n => n.id === link.source);
                    const target = nextNodes.find(n => n.id === link.target);
                    if (source && target) {
                        const dx = target.x - source.x;
                        const dy = target.y - source.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                        const force = (dist - SPRING_LENGTH) * SPRING_K;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        source.vx += fx;
                        source.vy += fy;
                        target.vx -= fx;
                        target.vy -= fy;
                    }
                });

                // 3. Center Gravity & Wall Repulsion
                nextNodes.forEach(node => {
                    // Dragging override
                    if (node.id === draggingNode) return;

                    // Center Pull
                    node.vx += (width / 2 - node.x) * CENTER_GRAVITY;
                    node.vy += (height / 2 - node.y) * CENTER_GRAVITY;

                    // Wall Constraints
                    const margin = 50;
                    if (node.x < margin) node.vx += (margin - node.x) * 0.1;
                    if (node.x > width - margin) node.vx -= (node.x - (width - margin)) * 0.1;
                    if (node.y < margin) node.vy += (margin - node.y) * 0.1;
                    if (node.y > height - margin) node.vy -= (node.y - (height - margin)) * 0.1;

                    // Apply Velocity
                    node.x += node.vx;
                    node.y += node.vy;

                    // Damping (Friction)
                    node.vx *= DAMPING;
                    node.vy *= DAMPING;
                });

                return nextNodes;
            });

            animationRef.current = requestAnimationFrame(tick);
        };

        animationRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationRef.current!);
    }, [nodes.length, links, dimensions, draggingNode]); // Depend on length only to avoid rapid resets, state updates drive loop

    // Handlers
    const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setDraggingNode(nodeId);
        onSelectNode(nodeId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNode) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                setNodes(prev => prev.map(n =>
                    n.id === draggingNode ? { ...n, x, y, vx: 0, vy: 0 } : n
                ));
            }
        }
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden bg-background/50 rounded-lg border shadow-inner"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md text-xs border shadow-sm">
                <span className="font-semibold text-foreground">Memory Health</span>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-primary opacity-100"></span> <span className="text-muted-foreground">Fresh</span>
                    <span className="w-2 h-2 rounded-full bg-primary opacity-40"></span> <span className="text-muted-foreground">Fading</span>
                </div>
            </div>

            <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
                {/* Links */}
                {links.map((link, i) => {
                    const source = nodes.find(n => n.id === link.source);
                    const target = nodes.find(n => n.id === link.target);
                    if (!source || !target) return null;

                    return (
                        <line
                            key={i}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            className="stroke-muted-foreground/20 stroke-1"
                        />
                    );
                })}
                {/* Nodes */}
                {nodes.map(node => {
                    const isSelected = selectedNodeId === node.id;
                    const radius = Math.max(25, 20 + node.count * 4); // Larger nodes
                    // Opacity Floor: 0.5 (Faded) -> 1.0 (Fresh)
                    const opacity = 0.5 + (node.freshness * 0.5);

                    return (
                        <g
                            key={node.id}
                            transform={`translate(${node.x},${node.y})`}
                            className="pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-300"
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                            style={{ opacity: isSelected ? 1 : opacity }}
                        >
                            <circle
                                r={radius}
                                className={`
                            fill-background stroke-2 transition-all duration-300
                            ${isSelected ? 'stroke-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'stroke-muted-foreground/40 hover:stroke-primary/80'}
                        `}
                            />
                            {/* Inner Spirit Circle */}
                            <circle
                                r={radius - 6}
                                className={`
                            transition-all duration-500
                            ${isSelected ? 'fill-primary/20' : 'fill-primary/5'}
                        `}
                                // Freshness color boost
                                style={{ fillOpacity: isSelected ? 0.3 : node.freshness * 0.2 }}
                            />
                            <text
                                className="text-[11px] font-semibold fill-foreground select-none pointer-events-none capitalize"
                                textAnchor="middle"
                                dy=".3em"
                                style={{ textShadow: '0 0 10px hsl(var(--background))' }}
                            >
                                {node.id.length > 10 ? node.id.substring(0, 8) + '..' : node.id}
                            </text>
                        </g>
                    );
                })}
            </svg>
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    Loading Neural Map...
                </div>
            )}
        </div>
    );
};
