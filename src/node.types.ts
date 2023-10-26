import { v4 } from "uuid";

// combined types and contstants for brevity
export const MI_TO_KM = 1.60934;
export const NAN_STRING = "isNaN";
export type NodeProperties = "value" | "miles" | "km";

export const nodeTypes = {
  INPUT: "input",
  DISTANCE_CONVERTER: "distanceConverter",
} as const;

export type PropsRecord = Record<NodeProperties, string>;
export type PartialProps = Partial<PropsRecord>;

export type NodeProperty = {
  name: NodeProperties;
  get: () => string;
  set: (val: string) => PartialProps | null;
};

export interface BaseNode {
  name: string;
  id: string;
  properties: {
    [key in NodeProperties]?: NodeProperty;
  };
}

export interface InputNode extends BaseNode {
  type: typeof nodeTypes.INPUT;
  properties: {
    value: NodeProperty;
  };
}

export interface DistanceConverterNode extends BaseNode {
  type: typeof nodeTypes.DISTANCE_CONVERTER;
  properties: {
    miles: NodeProperty;
    km: NodeProperty;
  };
}
export type Node = InputNode | DistanceConverterNode;

export interface NodeConnector {
  nodeId: string;
  propName: NodeProperties;
  path: string;
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

export const dummyInputNode: InputNode = {
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
