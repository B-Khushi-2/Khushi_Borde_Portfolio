import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { GraphNode, GraphEdge } from "./graphModel";
import {
  COLORS,
  badgeFor,
  computeLayout,
  assignSpawnDelays,
  tickPhysics,
} from "./graphModel";

interface R3FGraphSceneProps {
  model: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    nodeById: Map<string, GraphNode>;
    adjacency: Map<string, Set<string>>;
    structuralIds: Set<string>;
  };
  activeFilter: string;
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  hoveredEdge: GraphEdge | null;
  onSelectNode: (node: GraphNode | null) => void;
  onHoverNode: (node: GraphNode | null) => void;
  onHoverEdge: (edge: GraphEdge | null, sx: number, sy: number) => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function R3FGraphScene({
  model,
  activeFilter,
  selectedNode,
  hoveredNode,
  hoveredEdge,
  onSelectNode,
  onHoverNode,
  onHoverEdge,
}: R3FGraphSceneProps) {
  const { size, camera } = useThree();
  const { nodes, edges, adjacency, structuralIds } = model;

  const dragNodeRef = useRef<GraphNode | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const viewRef = useRef({ scale: 1, ox: 0, oy: 0 });
  const viewAnimRef = useRef<{
    startOx: number;
    startOy: number;
    startScale: number;
    targetOx: number;
    targetOy: number;
    targetScale: number;
    startTime: number;
    duration: number;
  } | null>(null);

  const startTimeRef = useRef(performance.now());
  const selectedAtRef = useRef(performance.now());
  const pulsesRef = useRef(new Map<string, number>());
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Layout initialization
  useEffect(() => {
    computeLayout(nodes, size.width, size.height);
    nodes.forEach((n) => {
      n.x = n.ax;
      n.y = n.ay;
    });
    assignSpawnDelays(nodes);
    startTimeRef.current = performance.now();
  }, [nodes, size.width, size.height]);

  useEffect(() => {
    if (selectedNode) {
      selectedAtRef.current = performance.now();
      const neighbors = Array.from(adjacency.get(selectedNode.id) || []);
      neighbors.forEach((id, i) => {
        setTimeout(() => {
          pulsesRef.current.set(id, performance.now());
        }, i * 55);
      });

      const targetScale = clamp(Math.max(viewRef.current.scale, 1.5), 0.6, 2.4);
      animateViewTo(selectedNode.x, selectedNode.y, targetScale);
    }
  }, [selectedNode, adjacency]);

  function animateViewTo(wx: number, wy: number, targetScale: number) {
    if (reducedMotion) {
      viewRef.current.scale = targetScale;
      viewRef.current.ox = size.width / 2 - wx * targetScale;
      viewRef.current.oy = size.height / 2 - wy * targetScale;
      return;
    }
    viewAnimRef.current = {
      startOx: viewRef.current.ox,
      startOy: viewRef.current.oy,
      startScale: viewRef.current.scale,
      targetOx: size.width / 2 - wx * targetScale,
      targetOy: size.height / 2 - wy * targetScale,
      targetScale,
      startTime: performance.now(),
      duration: 560,
    };
  }

  function screenToWorld(sx: number, sy: number) {
    const v = viewRef.current;
    return { x: (sx - v.ox) / v.scale, y: (sy - v.oy) / v.scale };
  }

  function nodeAt(sx: number, sy: number) {
    const w = screenToWorld(sx, sy);
    let best: GraphNode | null = null;
    let bestD = Infinity;
    const now = performance.now();
    for (const n of nodes) {
      if (n.visAlpha < 0.5) continue;
      const t = (now - startTimeRef.current - n.spawnDelay) / 420;
      if (!reducedMotion && t < 0.5) continue;
      const dx = n.x - w.x, dy = n.y - w.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= n.r + 6 && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = clamp(t, 0, 1);
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  function edgeAt(sx: number, sy: number) {
    const w = screenToWorld(sx, sy);
    const threshold = 5 / viewRef.current.scale;
    let best: GraphEdge | null = null;
    let bestD = Infinity;
    for (const e of edges) {
      const d = distToSegment(w.x, w.y, e.a.x, e.a.y, e.b.x, e.b.y);
      if (d <= threshold && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  // Pointer event listeners on canvas container
  useEffect(() => {
    const canvasEl = document.querySelector("#r3f-graph-container") || window;

    const handleWheel = (e: Event) => {
      const we = e as WheelEvent;
      we.preventDefault();
      viewAnimRef.current = null;
      const rect = (canvasEl as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 };
      const sx = we.clientX - rect.left;
      const sy = we.clientY - rect.top;
      const before = screenToWorld(sx, sy);
      const delta = -we.deltaY * 0.0012;
      const v = viewRef.current;
      v.scale = Math.min(2.4, Math.max(0.45, v.scale * (1 + delta)));
      const after = screenToWorld(sx, sy);
      v.ox += (after.x - before.x) * v.scale;
      v.oy += (after.y - before.y) * v.scale;
    };

    const handlePointerDown = (e: Event) => {
      const pe = e as PointerEvent;
      viewAnimRef.current = null;
      const rect = (canvasEl as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 };
      const sx = pe.clientX - rect.left;
      const sy = pe.clientY - rect.top;
      const n = nodeAt(sx, sy);
      didDragRef.current = false;

      if (n) {
        dragNodeRef.current = n;
        const w = screenToWorld(sx, sy);
        dragOffsetRef.current = { x: n.x - w.x, y: n.y - w.y };
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: sx - viewRef.current.ox, y: sy - viewRef.current.oy };
      }
    };

    const handlePointerMove = (e: Event) => {
      const pe = e as PointerEvent;
      const rect = (canvasEl as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 };
      const sx = pe.clientX - rect.left;
      const sy = pe.clientY - rect.top;

      if (dragNodeRef.current) {
        didDragRef.current = true;
        const w = screenToWorld(sx, sy);
        const newX = w.x + dragOffsetRef.current.x;
        const newY = w.y + dragOffsetRef.current.y;
        dragNodeRef.current._relVX = newX - dragNodeRef.current.x;
        dragNodeRef.current._relVY = newY - dragNodeRef.current.y;
        dragNodeRef.current.x = newX;
        dragNodeRef.current.y = newY;
        dragNodeRef.current.ax = newX;
        dragNodeRef.current.ay = newY;
        dragNodeRef.current.vx = 0;
        dragNodeRef.current.vy = 0;
      } else if (isPanningRef.current) {
        didDragRef.current = true;
        viewRef.current.ox = sx - panStartRef.current.x;
        viewRef.current.oy = sy - panStartRef.current.y;
      } else {
        const n = nodeAt(sx, sy);
        if (n !== hoveredNode) {
          onHoverNode(n);
        }
        if (!n) {
          const edge = edgeAt(sx, sy);
          onHoverEdge(edge, sx, sy);
        } else {
          onHoverEdge(null, 0, 0);
        }
      }
    };

    const handlePointerUp = (e: Event) => {
      const pe = e as PointerEvent;
      const rect = (canvasEl as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 };
      const sx = pe.clientX - rect.left;
      const sy = pe.clientY - rect.top;
      const wasDrag = didDragRef.current;

      if (dragNodeRef.current) {
        dragNodeRef.current.vx = (dragNodeRef.current._relVX || 0) * 0.5;
        dragNodeRef.current.vy = (dragNodeRef.current._relVY || 0) * 0.5;
      }
      dragNodeRef.current = null;
      isPanningRef.current = false;

      if (!wasDrag) {
        const n = nodeAt(sx, sy);
        onSelectNode(n);
      }
    };

    const targetEl = document.querySelector("#r3f-graph-container") || window;
    targetEl.addEventListener("wheel", handleWheel, { passive: false });
    targetEl.addEventListener("pointerdown", handlePointerDown);
    targetEl.addEventListener("pointermove", handlePointerMove);
    targetEl.addEventListener("pointerup", handlePointerUp);

    return () => {
      targetEl.removeEventListener("wheel", handleWheel);
      targetEl.removeEventListener("pointerdown", handlePointerDown);
      targetEl.removeEventListener("pointermove", handlePointerMove);
      targetEl.removeEventListener("pointerup", handlePointerUp);
    };
  }, [size.width, size.height, hoveredNode, onHoverNode, onSelectNode, onHoverEdge]);

  // Physics and Animation frame loop
  useFrame((_, delta) => {
    const dtMs = clamp(delta * 1000, 1, 48);
    const now = performance.now();

    // View animation update
    if (viewAnimRef.current) {
      const anim = viewAnimRef.current;
      const t = clamp((now - anim.startTime) / anim.duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      viewRef.current.ox = lerp(anim.startOx, anim.targetOx, eased);
      viewRef.current.oy = lerp(anim.startOy, anim.targetOy, eased);
      viewRef.current.scale = lerp(anim.startScale, anim.targetScale, eased);
      if (t >= 1) viewAnimRef.current = null;
    }

    tickPhysics(nodes, dtMs, now, dragNodeRef.current, activeFilter, reducedMotion, startTimeRef.current);

    const v = viewRef.current;
    if (camera.type === "OrthographicCamera") {
      const orthoCam = camera as THREE.OrthographicCamera;
      orthoCam.left = -v.ox / v.scale;
      orthoCam.right = (size.width - v.ox) / v.scale;
      orthoCam.top = v.oy / v.scale;
      orthoCam.bottom = -(size.height - v.oy) / v.scale;
      orthoCam.updateProjectionMatrix();
    }
  });

  const focus = selectedNode || hoveredNode;
  const highlightSet = useMemo(
    () => (selectedNode ? adjacency.get(selectedNode.id) : hoveredNode ? adjacency.get(hoveredNode.id) : null),
    [selectedNode, hoveredNode, adjacency]
  );

  return (
    <group>
      {/* Edges */}
      {edges.map((e, idx) => {
        const isHot = focus && (e.a === focus || e.b === focus);
        const isStructural = structuralIds.has(e.a.id + "|" + e.b.id);
        const isHovered = hoveredEdge === e;

        let lineColor = COLORS.faintEdge;
        if (isHovered) lineColor = COLORS[e.a.type] || COLORS.text;
        else if (isHot) lineColor = COLORS.text;
        else if (isStructural) lineColor = COLORS.border;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(e.a.x, -e.a.y, 0),
          new THREE.Vector3(e.b.x, -e.b.y, 0),
        ]);

        return (
          <primitive
            key={`edge-${e.a.id}-${e.b.id}-${idx}`}
            object={
              new THREE.Line(
                lineGeo,
                new THREE.LineBasicMaterial({
                  color: lineColor,
                  opacity: isHot ? 0.6 : 0.2,
                  transparent: true,
                })
              )
            }
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const isConnected = focus ? n === focus || (highlightSet && highlightSet.has(n.id)) : true;
        const opacity = isConnected ? n.visAlpha * n.dimAlpha : n.visAlpha * 0.22;
        const color = COLORS[n.type] || COLORS.hub;
        const badge = badgeFor(n);

        return (
          <group key={n.id} position={[n.x, -n.y, 1]}>
            {/* Circle Mesh */}
            <mesh>
              <circleGeometry args={[n.r, 32]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>

            {/* Circle Ring / Border */}
            <mesh>
              <ringGeometry args={[n.r - 0.5, n.r + 0.5, 32]} />
              <meshBasicMaterial color={color} transparent opacity={opacity * 0.9} />
            </mesh>

            {/* Badge Icon */}
            {badge && n.type !== "core" && (
              <Text
                position={[0, 0, 0.2]}
                fontSize={Math.max(n.r * 0.9, 7)}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
              >
                {badge}
              </Text>
            )}

            {/* Label */}
            {(n.type === "core" || n.type === "hub" || n === focus || (highlightSet && highlightSet.has(n.id))) && (
              <Text
                position={[0, -(n.r + 10), 0.3]}
                fontSize={n.type === "core" ? 14 : 10}
                color={COLORS.text}
                anchorX="center"
                anchorY="top"
              >
                {n.type === "hub" ? n.label.toUpperCase() : n.label}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}
