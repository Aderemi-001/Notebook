import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Sparkles, ZoomIn, ZoomOut, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { constellationService } from '@/services/constellationService';

// --- Types ---

interface ConceptNode {
  id: string;
  name: string;
  description?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

interface ConceptLink {
  source: string;
  target: string;
  type: string;
  strength: number;
}

const CognitiveConstellation: React.FC = () => {
  const { toast } = useToast();

  // Graph State
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const draggingNode = useRef<string | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // --- Data Fetching ---

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await constellationService.getGraphData();

      // Initialize positions randomly but clustered
      const width = 1000;
      const height = 800;

      const initialNodes: ConceptNode[] = data.nodes.map(n => ({
        ...n,
        description: n.description ?? undefined,
        x: width / 2 + (Math.random() - 0.5) * 400,
        y: height / 2 + (Math.random() - 0.5) * 400,
        vx: 0,
        vy: 0,
        mass: 1 + (data.edges.filter(e => e.source === n.id || e.target === n.id).length * 0.5)
      }));

      setNodes(initialNodes);
      setLinks(data.edges.map(e => ({
        ...e,
        strength: e.strength ?? 1
      })));
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load your constellation.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Generation ---

  const handleGenerateValues = async () => {
    setGenerating(true);
    try {
      const result = await constellationService.generateUniverse();
      if (result.conceptsLength > 0) {
        toast({ title: "Universe Expanded", description: `Discovered and mapped ${result.conceptsLength} concepts!` });
        await fetchData(); // Refresh
      } else {
        toast({ title: "No New Stars", description: "Try adding more study sets to expand your universe." });
      }
    } catch (e) {
      toast({ title: "Generation Failed", description: "Nova could not map the stars right now.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // --- Physics Simulation ---

  useEffect(() => {
    if (loading || nodes.length === 0) return;

    const tick = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n }));
        const currentLinks = links;

        // Constants
        const REPULSION = 5000;
        const SPRING_LENGTH = 150;
        const SPRING_K = 0.05;
        const CENTER_GRAVITY = 0.02;
        const DAMPING = 0.85;

        // 1. Repulsion (Nodes push apart)
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            const force = REPULSION / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            newNodes[i].vx += fx / newNodes[i].mass;
            newNodes[i].vy += fy / newNodes[i].mass;
            newNodes[j].vx -= fx / newNodes[j].mass;
            newNodes[j].vy -= fy / newNodes[j].mass;
          }
        }

        // 2. Attraction (Links pull together)
        currentLinks.forEach(link => {
          const source = newNodes.find(n => n.id === link.source);
          const target = newNodes.find(n => n.id === link.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const displacement = dist - SPRING_LENGTH;
            const force = displacement * SPRING_K * (link.strength || 0.5); // Stronger links = stiffer springs

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        });

        // 3. Center Gravity (Pull to middle to prevent flying away)

        newNodes.forEach(node => {
          // We coordinate system is shifted, assuming 0,0 is center of universe
          // In our render, we translate 0,0 to center of screen.
          // So let's pull towards 0,0 (virtual center)

          // Current random init might have them at 500,400. Let's shift logic:
          // If we assume the "center of the universe" is logical 0,0.

          // Use a "soft box" gravity
          node.vx -= (node.x - 500) * CENTER_GRAVITY; // 500 is logical center (width/2)
          node.vy -= (node.y - 400) * CENTER_GRAVITY;
        });

        // 4. Update Positions
        return newNodes.map(node => {
          if (draggingNode.current === node.id) return node; // Don't move if dragging

          let vx = node.vx * DAMPING;
          let vy = node.vy * DAMPING;

          // Velocity cap
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > 15) {
            vx = (vx / speed) * 15;
            vy = (vy / speed) * 15;
          }

          return { ...node, x: node.x + vx, y: node.y + vy, vx, vy };
        });
      });
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [links, loading]);

  // --- Event Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!draggingNode.current) {
      setIsDraggingCanvas(true);
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNode.current) {
      // Dragging a Node
      const svg = svgRef.current;
      if (!svg) return;

      // Convert screen coordinates to SVG coordinates
      // This maps the mouse movement relative to the current zoom/pan transform
      // We update the dragged node's position directly

      // Simple approach: Delta movement
      // Ideally we project the mouse point to SVG space.

      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Inverse transform
      const graphX = (mouseX - transform.x - rect.width / 2) / transform.k + 500; // 500 is logical center offset
      const graphY = (mouseY - transform.y - rect.height / 2) / transform.k + 400;

      setNodes(prev => prev.map(n =>
        n.id === draggingNode.current ? { ...n, x: graphX, y: graphY, vx: 0, vy: 0 } : n
      ));
      return;
    }

    if (isDraggingCanvas && lastPointer.current) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDraggingCanvas(false);
    draggingNode.current = null;
    lastPointer.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleChange = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, transform.k + scaleChange), 5);
    setTransform(t => ({ ...t, k: newScale }));
  };

  // --- Render ---

  if (loading && nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-pulse">
        <Brain className="h-16 w-16 text-indigo-500 mb-4 animate-bounce" />
        <p className="text-xl font-medium text-indigo-300">Consulting the Stars...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-white flex flex-col">

      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[150px]" />
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex flex-col md:flex-row justify-between items-start md:items-center pointer-events-none">
        <div className="pointer-events-auto">
          <Button variant="ghost" className="text-slate-400 hover:text-white mb-2 pl-0" asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
          </Button>
          <h1 className="text-4xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
            <Sparkles className="text-yellow-400 h-8 w-8" />
            Cognitive Constellation
          </h1>
          <p className="text-slate-400 text-sm max-w-md">
            Visualize the hidden connections between your study topics.
            {nodes.length} stars mapped.
          </p>
        </div>

        <div className="flex gap-2 pointer-events-auto mt-4 md:mt-0">
          {nodes.length === 0 && !generating && (
            <div className="absolute top-24 left-6 animate-bounce">
              <p className="text-yellow-400 text-sm font-bold">Start here! ➔</p>
            </div>
          )}
          <Button
            onClick={handleGenerateValues}
            disabled={generating}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/25"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mapping Universe...</>
            ) : (
              <><Brain className="mr-2 h-4 w-4" /> AI Map Knowledge</>
            )}
          </Button>
          <Button variant="outline" size="icon" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setTransform(t => ({ ...t, k: t.k * 1.2 }))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setTransform(t => ({ ...t, k: t.k / 1.2 }))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {nodes.length === 0 && !generating && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="text-center p-8 max-w-lg bg-black/40 backdrop-blur-md rounded-3xl border border-white/10">
            <Sparkles className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your Universe is Empty</h2>
            <p className="text-slate-400 mb-6">
              Nova hasn't mapped your study sets yet. Click the <span className="text-indigo-400 font-bold">AI Map Knowledge</span> button to analyze your cards and build your constellation.
            </p>
          </div>
        </div>
      )}

      {/* Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Center visual guide (optional) -> We center at 50% width/height of standard view */}
          {/* Links */}
          {links.map((link, i) => {
            const s = nodes.find(n => n.id === link.source);
            const t = nodes.find(n => n.id === link.target);
            if (!s || !t) return null;
            return (
              <line
                key={i}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="rgba(99, 102, 241, 0.2)"
                strokeWidth={link.strength ? link.strength * 4 : 1}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                draggingNode.current = node.id;
                setSelectedNode(node);
              }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer group"
            >
              {/* Glow */}
              <circle r={node.mass * 8} fill="url(#star-glow)" opacity="0.1" className="group-hover:opacity-0.3 transition-opacity" />

              {/* Core */}
              <circle
                r={node.mass * 2 + 2}
                fill={selectedNode?.id === node.id ? "#fcd34d" : "#c7d2fe"}
                className="transition-colors duration-300 shadow-lg shadow-white/50"
              />

              {/* Label */}
              {(hoveredNode?.id === node.id || selectedNode?.id === node.id || node.mass > 5) && (
                <text
                  y={-10 - node.mass * 2}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  className="pointer-events-none drop-shadow-md select-none bg-black/50"
                >
                  {node.name}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Selected Node Panel */}
      {/* Selected Node Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute top-0 right-0 h-full w-full sm:w-96 bg-black/80 backdrop-blur-xl border-l border-white/10 p-6 shadow-2xl z-20 overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-indigo-500/20 rounded-xl">
                <Brain className="h-8 w-8 text-indigo-400" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">{selectedNode.name}</h2>
            <p className="text-indigo-300 text-sm font-medium mb-6 uppercase tracking-wider">Concept Node</p>

            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Definition</h3>
                <p className="text-slate-100 leading-relaxed">
                  {selectedNode.description || "No description available."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" /> Connected Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {links
                    .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                    .map(l => {
                      const otherId = l.source === selectedNode.id ? l.target : l.source;
                      const otherNode = nodes.find(n => n.id === otherId);
                      return otherNode ? (
                        <Button
                          key={otherId}
                          variant="secondary"
                          size="sm"
                          className="bg-indigo-900/40 text-indigo-100 hover:bg-indigo-900/60 border border-indigo-500/30"
                          onClick={() => setSelectedNode(otherNode)}
                        >
                          {otherNode.name}
                        </Button>
                      ) : null;
                    })
                  }
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <Button className="w-full bg-white text-black hover:bg-indigo-50" asChild>
                  <Link to={`/search?q=${selectedNode.name}`}>Find Cards for "{selectedNode.name}"</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CognitiveConstellation;