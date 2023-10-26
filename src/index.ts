import { v4 } from "uuid";
import {
  NodeConnector,
  NodeProperties,
  createNodeConnector,
  dummyInputNode,
  Node,
} from "./node.types";

export type SystemNodes = Record<string, Node>;
export type SystemConnections = Record<string, NodeConnector[]>;
export interface NodeSystemClient {
  add: (newNode: Node) => string;
  connect: (props: {
    toConnector: NodeConnector;
    fromConnector: NodeConnector;
  }) => void;
  disconnect: (disconnect: NodeConnector, from: NodeConnector) => void;
  display: () => void;
  getConns: () => SystemConnections;
  getNode: (id: string) => Node;
  getNodes: () => SystemNodes;
  getUpdateList: (
    connections: NodeConnector[],
    target: NodeConnector
  ) => NodeConnector[];
  remove: (id: string) => void;
  update: (props: {
    origin: NodeConnector;
    val: string;
    updateOrigin?: boolean;
  }) => void;
}

export const createClient = (): NodeSystemClient => {
  const nodes: SystemNodes = {};
  const nodeConns: SystemConnections = {};

  const add = (newNode: Node): string => {
    nodes[newNode.id] = newNode;
    return newNode.id;
  };

  const addConnection = (
    toConnector: NodeConnector,
    fromConnector: NodeConnector
  ) => {
    const conns = nodeConns[toConnector.path];
    if (!conns) {
      nodeConns[toConnector.path] = [fromConnector];
      return;
    }

    nodeConns[toConnector.path] = Array.from(
      new Set([...conns, fromConnector])
    );
  };

  const connect = ({
    toConnector: toConn,
    fromConnector: fromConn,
  }: {
    toConnector: NodeConnector;
    fromConnector: NodeConnector;
  }) => {
    const existingNodeIds = Object.keys(nodes);
    const toNode = nodes[toConn.nodeId];
    const fromNode = nodes[fromConn.nodeId];
    if (!toNode) {
      throw new Error(
        `#connect: invalid nodeId ${
          toConn.nodeId
        } specified\n\nSystem nodes: [${existingNodeIds.join(",")}]`
      );
    }

    if (!fromNode) {
      throw new Error(
        `#connect: invalid nodeId ${
          fromConn.nodeId
        } specified\n\nSystem nodes: [${existingNodeIds.join(",")}]`
      );
    }

    addConnection(toConn, fromConn);
    addConnection(fromConn, toConn);

    // @ts-ignore
    const toValue = toNode.properties[toConn.propName].get();

    update({
      origin: toConn,
      val: toValue,
      updateOrigin: false,
    });
  };
  // remove the connection in both directions
  const disconnect = (disconnect: NodeConnector, from: NodeConnector) => {
    const disconnectPath = disconnect.path;
    const fromPath = from.path;

    const disconnectConns = nodeConns[disconnectPath];
    const fromConns = nodeConns[fromPath];

    if (!disconnectConns && !fromConns) {
      return;
    }

    nodeConns[disconnectPath] = disconnectConns.filter(
      ({ nodeId }) => nodeId !== from.nodeId
    );
    nodeConns[fromPath] = fromConns.filter(
      ({ nodeId }) => nodeId !== disconnect.nodeId
    );
  };

  const getAllUpdateTargets = (
    connections: NodeConnector[],
    origin: NodeConnector
  ): NodeConnector[] => {
    const originPath = origin.path;
    const originConnections = nodeConns[originPath] ?? [];
    const newConns = originConnections.filter(
      ({ path }) =>
        !connections.find(({ path: innerPath }) => innerPath === path)
    );
    const toCrawl = [...newConns];
    toCrawl.forEach((connector) => {
      const innerConns = getAllUpdateTargets(
        [...connections, ...newConns],
        connector
      );
      newConns.push(...innerConns);
    });

    return Array.from(new Set(newConns));
  };

  const update = ({
    origin,
    val,
    updateOrigin = true,
  }: {
    origin: NodeConnector;
    val: string;
    updateOrigin?: boolean;
  }) => {
    const startingList = updateOrigin ? [] : [origin];
    // get the full list of things to update
    const updateList = getAllUpdateTargets(startingList, origin);

    for (let index = 0; index < updateList.length; index++) {
      const upConnector = updateList[index];

      const rippleUpdates =
        // @ts-ignore
        nodes[upConnector.nodeId].properties[upConnector.propName].set(val);
      if (!rippleUpdates) {
        continue;
      }
      Object.keys(rippleUpdates).forEach((key: string) => {
        const propName = key as NodeProperties;
        const rippleConnector = createNodeConnector(
          upConnector.nodeId,
          propName
        );
        update({
          origin: rippleConnector,
          val: rippleUpdates[key],
          updateOrigin: false,
        });
      });
    }
  };
  const display = () => {
    for (const nodeId in nodes) {
      const props = Object.keys(nodes[nodeId].properties).map(
        (propName: string) => {
          // @ts-ignore
          const prop = nodes[nodeId].properties[propName as NodeProperties];
          return `${propName}: ${prop.get()}`;
        }
      );
      console.log(
        JSON.stringify({ ...nodes[nodeId], properties: props }, null, 2)
      );
    }
  };
  const getNode = (id: string): Node => nodes[id] ?? dummyInputNode;

  return {
    display,
    add,
    disconnect,
    getNodes: () => nodes,
    getNode,
    // getValue: (id: string) => getNode(id).value,
    connect,
    getUpdateList: getAllUpdateTargets,
    update,
    getConns: () => nodeConns,
    remove: (id: string) => {},
  };
};
