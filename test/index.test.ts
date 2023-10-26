import {
  NAN_STRING,
  NodeConnector,
  NodeSystemClient,
  createClient,
  createDistanceConverterNode,
  createInputNode,
  createNodeConnector,
  getPath,
} from "../src/index";

describe("scenario 1", () => {
  it("adds", () => {
    const system = createClient();
    const nodeId = system.add(
      createInputNode({ name: "miles", value: "miles" })
    );

    const nodes = system.getNodes();
    expect(Object.keys(nodes).length).toEqual(1);
    expect(nodes[nodeId]).toBeDefined();
  });

  it("connects", () => {
    const sys = createClient();
    const milesId = sys.add(createInputNode({ name: "miles", value: "miles" }));
    const milesNode = sys.getNode(milesId);
    const milesConnector = createNodeConnector(milesId, "value");

    const kmId = sys.add(createInputNode({ name: "km", value: "kilometers" }));
    const kmNode = sys.getNode(kmId);
    const kmConnector = createNodeConnector(kmId, "value");

    sys.connect({ toConnector: milesConnector, fromConnector: kmConnector });

    expect(kmNode).toBeDefined();
    expect(milesNode).not.toBeNull();

    // @ts-ignore
    expect(kmNode.properties.value.get()).toEqual(
      // @ts-ignore
      milesNode.properties.value.get()
    );
    const thirdId = sys.add(createInputNode({ name: "other", value: "other" }));
    const thirdNode = sys.getNode(thirdId);
    const thirdConnector = createNodeConnector(thirdId, "value");

    expect(thirdNode).not.toBeNull();
    sys.connect({ toConnector: kmConnector, fromConnector: thirdConnector });

    const conns = sys.getConns();
    const connKeys = Object.keys(conns);
    expect(connKeys.length).toBe(3);
    // @ts-ignore
    expect(thirdNode.properties.value.get()).toEqual(
      // @ts-ignore
      milesNode.properties.value.get()
    );
    expect(conns[milesConnector.path]).toContain(kmConnector);
  });
  it("gets all updates", () => {
    const sys = createClient();
    const milesId = sys.add(createInputNode({ name: "miles", value: "miles" }));
    const milesNode = sys.getNode(milesId);
    const milesConnector = createNodeConnector(milesId, "value");

    const kmId = sys.add(createInputNode({ name: "km", value: "kilometers" }));
    const kmNode = sys.getNode(kmId);
    const kmConnector = createNodeConnector(kmId, "value");

    sys.connect({ toConnector: milesConnector, fromConnector: kmConnector });

    const thirdId = sys.add(createInputNode({ name: "other", value: "other" }));
    const thirdNode = sys.getNode(thirdId);
    const thirdConnector = createNodeConnector(thirdId, "value");

    sys.connect({ toConnector: kmConnector, fromConnector: thirdConnector });

    const updateList = [...sys.getUpdateList([], milesConnector)];
    expect(updateList.length).toBe(3);
  });
  it("updates", () => {
    const sys = createClient();
    const milesId = sys.add(createInputNode({ name: "miles", value: "miles" }));
    const milesNode = sys.getNode(milesId);
    const milesConnector = createNodeConnector(milesId, "value");

    const kmId = sys.add(createInputNode({ name: "km", value: "kilometers" }));

    const kmConnector = createNodeConnector(kmId, "value");

    sys.connect({ toConnector: milesConnector, fromConnector: kmConnector });
    sys.update({
      origin: milesConnector,
      val: "updated via miles",
      updateOrigin: true,
    });
    expect(areNodeValuesEqual(sys, [milesConnector, kmConnector])).toBe(true);
    const thirdId = sys.add(createInputNode({ name: "other", value: "other" }));
    const thirdNode = sys.getNode(thirdId);
    const thirdConnector = createNodeConnector(thirdId, "value");

    sys.connect({ toConnector: kmConnector, fromConnector: thirdConnector });
    sys.update({
      origin: kmConnector,
      val: "updated via km",
      updateOrigin: true,
    });
    // @ts-ignore
    expect(sys.getNode(milesId).properties.value.get()).toEqual(
      "updated via km"
    );
    expect(
      areNodeValuesEqual(sys, [kmConnector, milesConnector, thirdConnector])
    ).toBe(true);

    const otherFirst = sys.add(
      createInputNode({ name: "other first", value: "other first" })
    );
    const oFirstConnector = createNodeConnector(otherFirst, "value");
    const otherSecond = sys.add(
      createInputNode({ name: "other second", value: "other second" })
    );
    const oSecondConnector = createNodeConnector(otherSecond, "value");

    sys.connect({
      toConnector: oFirstConnector,
      fromConnector: oSecondConnector,
    });
    expect(areNodeValuesEqual(sys, [oFirstConnector, oSecondConnector])).toBe(
      true
    );
    sys.update({
      origin: oFirstConnector,
      val: "other update",
      updateOrigin: true,
    });
    expect(areNodeValuesEqual(sys, [oFirstConnector, oSecondConnector])).toBe(
      true
    );
    expect(areNodeValuesEqual(sys, [oFirstConnector, milesConnector])).toBe(
      false
    );
  });

  it("disconnects", () => {
    // create a system
    const sys = createClient();
    const milesId = sys.add(createInputNode({ name: "miles", value: "miles" }));
    const milesNode = sys.getNode(milesId);
    const milesConnector = createNodeConnector(milesId, "value");

    const kmId = sys.add(createInputNode({ name: "km", value: "kilometers" }));
    const kmNode = sys.getNode(kmId);
    const kmConnector = createNodeConnector(kmId, "value");

    sys.connect({ toConnector: milesConnector, fromConnector: kmConnector });

    const thirdId = sys.add(createInputNode({ name: "other", value: "other" }));
    const thirdNode = sys.getNode(thirdId);
    const thirdConnector = createNodeConnector(thirdId, "value");

    sys.connect({ toConnector: kmConnector, fromConnector: thirdConnector });

    sys.disconnect(thirdConnector, kmConnector);

    sys.update({
      origin: milesConnector,
      val: "updated via miles",
      updateOrigin: true,
    });
    sys.update({
      origin: thirdConnector,
      val: "updated via third",
      updateOrigin: true,
    });

    expect(areNodeValuesEqual(sys, [milesConnector, kmConnector])).toBe(true);
    expect(areNodeValuesEqual(sys, [milesConnector, thirdConnector])).toBe(
      false
    );

    sys.connect({ toConnector: kmConnector, fromConnector: thirdConnector });

    expect(areNodeValuesEqual(sys, [milesConnector, thirdConnector])).toBe(
      true
    );
  });
});
console.log("hi");

describe("scenario 2", () => {
  it("converts", () => {
    const sys = createClient();
    // add miles input and km input
    const milesId = sys.add(createInputNode({ name: "miles", value: "10" }));
    const milesValueConnector = createNodeConnector(milesId, "value");
    const kmId = sys.add(createInputNode({ name: "km", value: "10" }));
    const kmValueConnector = createNodeConnector(kmId, "value");

    const converterId = sys.add(
      createDistanceConverterNode({ name: "converter" })
    );

    const converterNode = sys.getNode(converterId);
    // verify that both miles and kilometers are "isNaN"
    // @ts-ignore
    expect(converterNode.properties.miles.get()).toEqual(NAN_STRING);

    // @ts-ignore
    expect(converterNode.properties.km.get()).toEqual(NAN_STRING);

    // @ts-ignore
    const milesRipples = converterNode.properties.miles.set("10");
    expect(milesRipples.km).toContain("16.09");

    // @ts-ignore
    const kmRipples = converterNode.properties.km.set("10");
    expect(kmRipples.miles).toContain("6.21");

    // @ts-ignore
    const nanRipples = converterNode.properties.km.set("hi");
    expect(nanRipples).toMatchObject({ miles: NAN_STRING, km: NAN_STRING });
  });

  it("updates on conversion", () => {
    const sys = createClient();
    // add miles input and km input
    const milesId = sys.add(createInputNode({ name: "miles", value: "10" }));
    const milesValueConnector = createNodeConnector(milesId, "value");
    const kmId = sys.add(createInputNode({ name: "km", value: "10" }));
    const kmValueConnector = createNodeConnector(kmId, "value");

    const converterId = sys.add(
      createDistanceConverterNode({ name: "converter" })
    );

    const converterMilesConnector = createNodeConnector(converterId, "miles");
    const converterKmConnector = createNodeConnector(converterId, "km");

    // from converter to input <- will take input's value
    sys.connect({
      fromConnector: converterMilesConnector,
      toConnector: milesValueConnector,
    });

    // from input to converter <- will take converter's value
    sys.connect({
      fromConnector: kmValueConnector,
      toConnector: converterKmConnector,
    });

    // @ts-ignore
    expect(sys.getNode(converterId).properties.km.get()).toContain("16.09");

    expect(
      areNodeValuesEqual(sys, [kmValueConnector, converterKmConnector])
    ).toBe(true);

    const miles2Id = sys.add(createInputNode({ name: "miles2", value: "10" }));
    const miles2ValueConnector = createNodeConnector(miles2Id, "value");
    sys.connect({
      fromConnector: miles2ValueConnector,
      toConnector: converterMilesConnector,
    });

    sys.update({
      origin: kmValueConnector,
      val: "10",
      updateOrigin: true,
    });
    sys.display();
    // @ts-ignore
    expect(sys.getNode(converterId).properties.km.get()).toContain("10");
    // @ts-ignore
    expect(sys.getNode(converterId).properties.miles.get()).toContain("6.21");
    expect(
      areNodeValuesEqual(sys, [
        milesValueConnector,
        converterMilesConnector,
        miles2ValueConnector,
      ])
    ).toBe(true);

    sys.disconnect(milesValueConnector, converterMilesConnector);
    sys.update({
      origin: converterMilesConnector,
      val: "10",
      updateOrigin: true,
    });
    // @ts-ignore
    expect(sys.getNode(miles2Id).properties.value.get()).toEqual("10");
  });
});

const areNodeValuesEqual = (
  sys: NodeSystemClient,
  nodeConns: NodeConnector[]
) => {
  const nodes = sys.getNodes();
  const firstConn = nodeConns[0];
  const value =
    // @ts-ignore
    nodes[firstConn.nodeId].properties[firstConn.propName].get();

  const otherNodeConns = nodeConns.slice(1);
  for (const nodeConn of otherNodeConns) {
    // @ts-ignore
    if (nodes[nodeConn.nodeId].properties[nodeConn.propName].get() !== value) {
      return false;
    }
  }
  return true;
};
