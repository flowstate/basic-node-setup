import { v4 } from "uuid";

// node
// list of string properties

// property
//
export const MI_TO_KM = 1.60934;
export const NAN_STRING = "isNaN";
type NodeProperties = "value" | "miles" | "km";

export const nodeTypes = {
  INPUT: "input",
  DISTANCE_CONVERTER: "distanceConverter",
} as const;

type PropsRecord = Record<NodeProperties, string>;
type PartialProps = Partial<PropsRecord>;

export type NodeProperty = {
  name: NodeProperties;
  get: () => string;
  set: (val: string) => PartialProps | null;
};

interface BaseNode {
  name: string;
  id: string;
  properties: {
    [key in NodeProperties]?: NodeProperty;
  };
}

interface InputNode extends BaseNode {
  type: typeof nodeTypes.INPUT;
  properties: {
    value: NodeProperty;
  };
}

export const createInputNode = ({
  name = "input",
  value = "default",
}: {
  name?: string;
  value?: string;
}): InputNode => {
  const props = {
    value,
  };

  return {
    name,
    id: v4(),
    type: nodeTypes.INPUT,
    properties: {
      value: {
        name: "value",
        get: () => props.value,
        set: (val: string) => {
          props.value = val;
          return null;
        },
      },
    },
  };
};

const dummyInputNode = {
  id: "dummy",
  properties: {
    value: {
      name: "value",
      get: () => "default node",
      set: () => null,
    },
  },
  type: "input",
  name: "default node",
};

interface DistanceConverterNode extends BaseNode {
  type: typeof nodeTypes.DISTANCE_CONVERTER;
  properties: {
    miles: NodeProperty;
    km: NodeProperty;
  };
}

export const createDistanceConverterNode = ({
  name,
  miles = NAN_STRING,
  km = NAN_STRING,
}: {
  name: string;
  miles?: string;
  km?: string;
}): DistanceConverterNode => {
  const props = {
    miles,
    km,
  };
  const converterNode: DistanceConverterNode = {
    name,
    id: v4(),
    type: nodeTypes.DISTANCE_CONVERTER,
    properties: {
      miles: {
        name: "miles",
        get: () => props.miles,
        set: (val: string) => {
          // if isNaN, set to "isNaN" and return {miles: "isNaN", km: "isNaN"}
          if (Number.isNaN(Number.parseFloat(val))) {
            props.miles = NAN_STRING;
            props.km = NAN_STRING;
            return { miles: NAN_STRING, km: NAN_STRING };
          }

          // convert from string to number
          const num = Number.parseFloat(val);
          // convert from miles to km and set props
          props.miles = val;
          props.km = (num * MI_TO_KM).toString();
          return { km: props.km };
        },
      },
      km: {
        name: "km",
        get: () => props.km,
        set: (val: string) => {
          // if isNaN, set both to "isNaN" and return {miles: "isNaN", km: "isNaN"}
          if (Number.isNaN(Number.parseFloat(val))) {
            props.miles = NAN_STRING;
            props.km = NAN_STRING;
            return { miles: NAN_STRING, km: NAN_STRING };
          }

          // otherwise convert and calculate
          const num = Number.parseFloat(val);
          props.km = val;
          props.miles = (num / MI_TO_KM).toString();
          return { miles: props.miles };
        },
      },
    },
  };

  if (props.miles !== NAN_STRING) {
    converterNode.properties.miles.set(props.miles);
    return converterNode;
  }

  if (props.km !== NAN_STRING) {
    converterNode.properties.km.set(props.km);
  }

  return converterNode;
};

export type Node = InputNode | DistanceConverterNode;

export type NodeType = keyof typeof nodeTypes;

export type SystemNodes = Record<string, Node>;
export type SystemConnections = Record<string, NodeConnector[]>;

export interface NodeSystemClient {
  add: (newNode: Node) => string;
  getNodes: () => SystemNodes;
  getNode: (id: string) => Node;
  // getValue: (id: string) => string;
  getConns: () => SystemConnections;
  remove: (id: string) => void;
  connect: (props: {
    toConnector: NodeConnector;
    fromConnector: NodeConnector;
  }) => void;
  update: (props: {
    origin: NodeConnector;
    val: string;
    updateOrigin?: boolean;
  }) => void;
  getUpdateList: (
    connections: NodeConnector[],
    target: NodeConnector
  ) => NodeConnector[];
  display: () => void;
  disconnect: (disconnect: NodeConnector, from: NodeConnector) => void;
}

export interface NodeConnector {
  nodeId: string;
  propName: NodeProperties;
  path: string;
}

export const createNodeConnector = (
  nodeId: string,
  propName: NodeProperties
): NodeConnector => {
  const path = getPath(nodeId, propName);
  return {
    nodeId,
    propName,
    path,
  };
};

export const getPath = (nodeId: string, propName: NodeProperties) => {
  return `${nodeId}.${propName}`;
};

export const getNodeId = (path: string) => path.split(".")[0];
export const getProperty = (path: string) => path.split(".")[1];

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
