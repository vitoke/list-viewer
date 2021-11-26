import "./styles.css";
import { Canvas, Node, NodeData, EdgeData, NodeProps } from "reaflow";
import { List as CList, ListCustom } from "@rimbu/list";
import type { List } from "@rimbu/list";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function App() {
  const [blockSizeBits, setBlockSizeBits] = useState(2);

  const CustomList = useMemo(() => CList.createContext({ blockSizeBits }), [
    blockSizeBits
  ]);

  const [firstValue, setFirstValue] = useState(0);
  const [lastValue, setLastValue] = useState(1);
  const [list, setList] = useState(CustomList.of(0).repeat(900).asNormal());

  useEffect(() => {
    setList((v) => CustomList.from(v));
  }, [CustomList]);

  // const [list, setList] = useState(CustomList.empty<number>());

  const { nodes, edges } = useMemo(() => {
    const nodes: NodeData[] = [];
    const edges: EdgeData[] = [];
    let nextId = 0;
    const idMap = new Map<any, string>();
    let index = 0;

    function addItems(l: List<number>): string | undefined {
      if (idMap.has(l)) return idMap.get(l);

      if (l.isEmpty) {
        nodes.push({
          id: "empty",
          text: "Empty",
          data: l
        });
        return "empty";
      } else if (l instanceof ListCustom.LeafBlock) {
        const id = `lb-${nextId++}-${l.children.length}`;

        nodes.push({
          id,
          text:
            l instanceof ListCustom.ReversedLeafBlock
              ? "ReversedLeafBLock"
              : "LeafBlock",
          data: l
        });

        for (const value of l) {
          const valueId = `item-${index++}`;

          if (idMap.has(valueId)) break;

          nodes.push({
            id: valueId,
            text: String(value)
          });
          edges.push({
            id: `lb-${id}-${valueId}`,
            from: id,
            to: valueId
          });
        }

        idMap.set(l, id);

        return id;
      } else if (
        l instanceof ListCustom.LeafTree ||
        l instanceof ListCustom.NonLeafTree
      ) {
        const id = `tr-${nextId++}`;

        nodes.push({
          id,
          text: l instanceof ListCustom.LeafTree ? "LeafTree" : "NonLeafTree",
          data: l
        });

        const leftId = addItems(l.left as any);

        const tp = l instanceof ListCustom.LeafTree ? "lt" : "nlt";

        edges.push({
          id: `${tp}-${id}-${leftId}`,
          from: id,
          to: leftId,
          text: "left"
        });

        if (l.middle !== null) {
          const middleId = addItems(l.middle as any);

          edges.push({
            id: `${tp}-${id}-${middleId}`,
            from: id,
            to: middleId
          });
        }

        const rightId = addItems(l.right as any);

        edges.push({
          id: `${tp}-${id}-${rightId}`,
          from: id,
          to: rightId,
          text: "right"
        });

        idMap.set(l, id);

        return id;
      } else if (l instanceof ListCustom.NonLeafBlock) {
        const id = `nlb-${nextId++}-${l.children.length}`;

        nodes.push({
          id,
          text: "NonLeafBlock",
          data: l
        });

        let b = 0;
        for (const child of l.children) {
          const childId = addItems(child);

          edges.push({
            id: `nlb-${id}-${childId}-${b++}`,
            from: id,
            to: childId
          });
        }

        idMap.set(l, id);

        return id;
      }
    }

    addItems(list);

    return { nodes, edges };
  }, [list]);

  const reverse = useCallback(() => {
    setList((l) => l.reversed());
  }, []);

  const reset = useCallback(() => {
    setList(CustomList.empty());
    setFirstValue(0);
    setLastValue(1);
  }, []);

  const prependItem = useCallback(() => {
    setList((l) => l.prepend(firstValue));
    setFirstValue((v) => v - 1);
  }, [firstValue]);

  const appendItem = useCallback(() => {
    setList((l) => l.append(lastValue));
    setLastValue((v) => v + 1);
  }, [lastValue]);

  const removeItem = useCallback((props: NodeProps) => {
    const { id } = props;

    if (id.startsWith("item-")) {
      const index = Number(id.substr(5));
      setList((l) => l.remove(index));
    }
  }, []);

  const blockSize = Math.pow(2, blockSizeBits);

  return (
    <div className="App">
      <div style={{ position: "fixed", top: 10, right: 10 }}>
        <button onClick={prependItem}>Prepend</button>
        <button onClick={appendItem}>Append</button>
        <button onClick={reverse}>Reverse</button>
        <button onClick={() => setList((v) => v.concat(v))}>Double</button>
        <button
          onClick={() => setBlockSizeBits((v) => Math.max(2, v - 1))}
          disabled={blockSizeBits <= 2}
        >
          Decrease block size
        </button>
        Block size: {blockSize}
        <button onClick={() => setBlockSizeBits((v) => v + 1)}>
          Increase block size
        </button>
        <button onClick={reset}>Reset</button>
      </div>
      <Canvas
        nodes={nodes}
        edges={edges}
        node={(nodeProps) => {
          let fill = undefined;

          const { data } = nodeProps.properties;

          if (data?.children) {
            if (data.children.length <= blockSize / 2) {
              fill = "rgb(50, 50, 200)";
            } else if (data.children.length >= blockSize) {
              fill = "rgb(200, 50, 50)";
            }
          }

          return (
            <Node
              {...nodeProps}
              style={{
                fill
              }}
              onClick={() => removeItem(nodeProps)}
            />
          );
        }}
      />
    </div>
  );
}
