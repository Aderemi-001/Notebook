import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Sparkles, ZoomIn, ZoomOut, RefreshCw, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ConceptNode {
  id: string;
  name: string;
  description?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface ConceptLink {
  source: string;
  target: string;
  type: string;
  strength: number;
}

interface RelatedSet {
  id: string;
  title: string;
  cardCount: number;
}

const CognitiveConstellation: React.FC = () => {
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);

  // Transform State (Pan & Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // Dialog State
  const [selectedConcept, setSelectedConcept] = useState<ConceptNode | null>(null);
  const [relatedSets, setRelatedSets] = useState<RelatedSet[]>([]);
  const [isCardsOpen, setIsCardsOpen] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const draggingNode = useRef<string | null>(null);

  const setScale = (fn: (s: number) => number) => {
    setTransform(prev => ({ ...prev, k: fn(prev.k) }));
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: concepts } = await supabase
          .from('concepts')
          .select('id, name, description')
          .eq('user_id', user.id);

        const { data: relationships } = await supabase
          .from('concept_relationships')
          .select('source_concept_id, target_concept_id, type, strength')
          .eq('user_id', user.id);

        if (concepts) {
          // Initialize random positions
          const initialNodes = concepts.map(c => ({
            ...c,
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: 0,
            vy: 0
          }));
          setNodes(initialNodes);
        }

        if (relationships) {
          setLinks(relationships.map(r => ({
            source: r.source_concept_id,
            target: r.target_concept_id,
            type: r.type,
            strength: r.strength
          })));
        }
      } catch (err) {
        showError("Failed to load constellation data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch related cards
  useEffect(() => {
    if (selectedConcept && isCardsOpen) {
      const fetchCards = async () => {
        setLoadingCards(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Split concept name into keywords and handle simple plurals/stems
        const keywords = selectedConcept.name
          .split(/\s+/)
          .filter(word => word.length > 2)
          .flatMap(word => {
            const variations = [word];
            // If it ends in 's', try the singular
            if (word.toLowerCase().endsWith('s')) {
              variations.push(word.slice(0, -1));
            }
            // If it's a long word, try a shorter prefix (stem-ish)
            if (word.length > 8) {
              variations.push(word.slice(0, Math.floor(word.length * 0.8)));
            }
            return variations;
          })
          .filter((v, i, a) => a.indexOf(v) === i) // Unique variations
          .map(word => `term.ilike.%${word}%,definition.ilike.%${word}%`)
          .join(',');

        const { data, error } = await supabase
          .from('cards')
          .select(`
            set_id,
            study_sets (
              id,
              title
            )
          `)
          .eq('user_id', user.id)
          .or(keywords || `term.ilike.%${selectedConcept.name}%`)
          .limit(50);

        if (!error && data) {
          // Group by set_id and count
          const setsMap = new Map<string, RelatedSet>();

          data.forEach((item: any) => {
            const set = item.study_sets;
            if (set && !setsMap.has(set.id)) {
              setsMap.set(set.id, {
                id: set.id,
                title: set.title,
                cardCount: data.filter((d: any) => d.set_id === set.id).length
              });
            }
          });

          setRelatedSets(Array.from(setsMap.values()));
        }
        setLoadingCards(false);
      };
      fetchCards();
    }
  }, [selectedConcept, isCardsOpen]);


  // Physics Simulation Loop
  useEffect(() => {
    if (loading || nodes.length === 0) return;

    const width = 800;
    const height = 600;
    const center = { x: width / 2, y: height / 2 };

    const tick = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n }));

        // 1. Repulsion
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            let force = 10000 / (dist * dist);
            const r1 = newNodes[i].name.length * 4 + 15;
            const r2 = newNodes[j].name.length * 4 + 15;
            const minDist = r1 + r2;

            if (dist < minDist) {
              force += (minDist - dist) * 0.2;
            }

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            newNodes[i].vx += fx;
            newNodes[i].vy += fy;
            newNodes[j].vx -= fx;
            newNodes[j].vy -= fy;
          }
        }

        // 2. Attraction
        links.forEach(link => {
          const source = newNodes.find(n => n.id === link.source);
          const target = newNodes.find(n => n.id === link.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 100) * 0.05;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        });

        // 3. Center Gravity
        newNodes.forEach(node => {
          const dx = center.x - node.x;
          const dy = center.y - node.y;
          node.vx += dx * 0.01;
          node.vy += dy * 0.01;
        });

        // 4. Update
        return newNodes.map(node => {
          if (draggingNode.current === node.id) return node;

          const vLimit = 10;
          const damping = 0.9;

          let vx = node.vx * damping;
          let vy = node.vy * damping;

          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > vLimit) {
            vx = (vx / speed) * vLimit;
            vy = (vy / speed) * vLimit;
          }

          return { ...node, x: node.x + vx, y: node.y + vy, vx, vy };
        });
      });
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [links, loading]);

  // Unified Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!draggingNode.current) {
      setIsDraggingCanvas(true);
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNode.current) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const graphX = ((rawX - transform.x - 400) / transform.k) + 400;
        const graphY = ((rawY - transform.y - 300) / transform.k) + 300;

        setNodes(prev => prev.map(n =>
          n.id === draggingNode.current
            ? { ...n, x: graphX, y: graphY, vx: 0, vy: 0 }
            : n
        ));
      }
      return;
    }

    if (isDraggingCanvas && lastPointer.current) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Check for Click (vs Drag)
    if (lastPointer.current && draggingNode.current) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - lastPointer.current.x, 2) +
        Math.pow(e.clientY - lastPointer.current.y, 2)
      );
      if (dist < 5) {
        const clickedNode = nodes.find(n => n.id === draggingNode.current);
        if (clickedNode) {
          setSelectedConcept(clickedNode);
          setIsCardsOpen(true);
        }
      }
    }

    setIsDraggingCanvas(false);
    draggingNode.current = null;
    lastPointer.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(5, transform.k * (1 + scaleAmount)));
    setTransform(prev => ({ ...prev, k: newScale }));
  };

  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingNode.current = id;
    // Start tracking pointer for click detection
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenConstellationTutorial');
    if (!hasSeen) {
      setShowTutorial(true);
      localStorage.setItem('hasSeenConstellationTutorial', 'true');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Brain className="h-12 w-12 text-primary animate-pulse mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary/50 mb-4" />
        <p className="text-muted-foreground animate-pulse">Consulting the stars...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <Sparkles className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Stars Found Yet</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Your constellation is empty. Create study sets with "AI Import" to generate concepts and build your knowledge graph!
        </p>
        <Button asChild>
          <Link to="/create">Create New Set</Link>
        </Button>
        <div className="mt-8">
          <Button variant="ghost" asChild>
            <Link to="/"> <ArrowLeft className="mr-2 h-4 w-4" /> Return Home </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-4 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
              <Brain className="h-7 w-7 text-primary" />
              Constellation <span className="text-xs font-normal px-2 py-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full">Beta</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Visualizing {nodes.length} concepts and {links.length} links</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 self-end sm:self-auto">
          <Button variant="outline" size="icon" onClick={() => setShowTutorial(true)} className="h-10 w-10">
            <span className="text-lg font-bold">?</span>
          </Button>
          <div className="w-px h-10 bg-border mx-1" />
          <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(s * 1.2, 3))} className="h-10 w-10">
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(s / 1.2, 0.5))} className="h-10 w-10">
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="h-10 w-10">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Tutorial Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-indigo-500" /> Welcome to Constellation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground text-sm">
              This 3D graph visualizes how all your study concepts connect.
            </p>
            <div className="grid gap-4">
              <div className="flex gap-3 items-start">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
                  <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Concepts (Stars)</h4>
                  <p className="text-xs text-muted-foreground">Each node is a concept. Use <ZoomIn className="h-3 w-3 inline" /> buttons to zoom in and read the labels.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-pink-100 dark:bg-pink-900/50 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Interactions</h4>
                  <p className="text-xs text-muted-foreground">
                    • <strong>Drag</strong> to move the view or rearrange stars.<br />
                    • <strong>Click</strong> a star to see study sets containing it.
                  </p>
                </div>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => setShowTutorial(false)}>Got it, let's explore!</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Related Cards */}
      <Dialog open={isCardsOpen} onOpenChange={setIsCardsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {selectedConcept?.name}
            </DialogTitle>
            <DialogDescription>
              This concept appears in {relatedSets.length} of your study sets.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 p-1">
            {loadingCards ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : relatedSets.length > 0 ? (
              relatedSets.map(set => (
                <Link
                  key={set.id}
                  to={`/sets/${set.id}/study`}
                  className="block p-4 border rounded-lg bg-card/50 hover:bg-card hover:border-primary/50 transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm text-primary group-hover:text-primary/80 transition-colors">{set.title}</div>
                      <div className="text-xs text-muted-foreground">{set.cardCount} matching cards found here</div>
                    </div>
                    <div className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Study Set →</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No sets found containing "{selectedConcept?.name}".
                <br /><span className="text-xs opacity-70">Try creating more cards or refining your search.</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visualization Canvas */}
      <Card className="flex-1 relative overflow-hidden bg-slate-950 rounded-xl shadow-2xl border-slate-800">
        <svg
          ref={svgRef}
          viewBox={`0 0 800 600`}
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
          style={{ touchAction: 'none' }} // Prevent browser zoom/scroll
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) translate(400, 300) scale(${transform.k}) translate(-400, -300)`}>
            {/* Edges */}
            {links.map((link, i) => {
              const source = nodes.find(n => n.id === link.source);
              const target = nodes.find(n => n.id === link.target);
              if (!source || !target) return null;
              return (
                <line
                  key={i}
                  x1={source.x} y1={source.y}
                  x2={target.x} y2={target.y}
                  stroke="rgba(148, 163, 184, 0.2)"
                  strokeWidth={Math.max(1, (link.strength || 0.5) * 3)}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow effect */}
                <circle r="25" fill="url(#glow)" opacity="0.5" className="animate-pulse" />

                {/* Core */}
                <circle
                  r={hoveredNode?.id === node.id ? 10 : 6}
                  fill={hoveredNode?.id === node.id ? "#ec4899" : "#6366f1"}
                  stroke="#fff"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />

                {/* Label - Larger font size */}
                <text
                  y={24}
                  textAnchor="middle"
                  fill={hoveredNode?.id === node.id ? "#fff" : "rgba(255,255,255,0.9)"}
                  fontSize={hoveredNode?.id === node.id ? "16" : "12"}
                  fontWeight={hoveredNode?.id === node.id ? "bold" : "500"}
                  className="pointer-events-none select-none transition-all drop-shadow-md"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {node.name}
                </text>
              </g>
            ))}
          </g>

          {/* Defs for gradients */}
          <defs>
            <radialGradient id="glow">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Hover Info Panel */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 max-w-xs bg-black/80 backdrop-blur border border-white/10 p-4 rounded-lg text-white shadow-xl animate-fade-in pointer-events-none z-50">
            <h3 className="font-bold text-lg text-indigo-300">{hoveredNode.name}</h3>
            {hoveredNode.description && <p className="text-sm text-slate-300 mt-1">{hoveredNode.description}</p>}
            <div className="mt-2 text-xs text-slate-500">
              Connected to {links.filter(l => l.source === hoveredNode.id || l.target === hoveredNode.id).length} other concepts
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CognitiveConstellation;