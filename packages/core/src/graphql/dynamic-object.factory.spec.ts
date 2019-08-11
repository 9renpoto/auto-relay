import { DynamicObjectFactory } from "./dynamic-object.factory";
import { Container } from "typedi";
import { AutoRelayConfig } from "../services/auto-relay-config.service";
import * as TGQL from 'type-graphql'
import { ORMConnection } from "../orm/orm-connection.abstract";


class ORMMock extends ORMConnection {
  public autoRelayFactory(field: any, self: any, type: any, through?: any) {
    return (): any => { };
  }
}


describe('DynamicObject factory', () => {
  let dynamicObjectFactory = new DynamicObjectFactory();

  beforeEach(() => {
    dynamicObjectFactory = new DynamicObjectFactory();
  })

  describe('makeEdgeConnection', () => {
    it('Should throw if PAGINATION_OBJECT wasn\'t init\'d', () => {
      expect(() => dynamicObjectFactory.makeEdgeConnection("", () => Object)).toThrowError(/PageInfo/)
    })

    it('Should throw if PAGINATION_OBJECT isn\'t a function', () => {
      Container.set('PAGINATION_OBJECT', {})
      expect(() => dynamicObjectFactory.makeEdgeConnection("", () => Object)).toThrowError(/PageInfo/)
    })

    it('Should throw if PAGINATION_OBJECT returns undefined', () => {
      Container.set('PAGINATION_OBJECT', () => undefined)
      expect(() => dynamicObjectFactory.makeEdgeConnection("", () => Object)).toThrowError(/PageInfo/)
    })

    it('Should return a decorated Edge Object', () => {
      new AutoRelayConfig({ orm: () => ORMMock });

      const fieldSpy = jest.spyOn(TGQL, 'Field');
      const objectSpy = jest.spyOn(TGQL, 'ObjectType');

      const objectInnerSpy = jest.fn();
      const fieldInnerSpy = jest.fn();
      fieldSpy.mockImplementation((_a, _b) => {
        return fieldInnerSpy;
      });
      objectSpy.mockImplementation((_a, _b) => {
        return objectInnerSpy;
      });

      const { Edge } = dynamicObjectFactory.makeEdgeConnection("Foo", () => Object)

      expect(Edge).toBeTruthy();
      expect(fieldInnerSpy.mock.calls).toIncludeAllMembers([
        [Edge.prototype, 'node'],
        [Edge.prototype, 'cursor']
      ])

      expect(objectSpy).toHaveBeenCalledWith('FooEdge');

      fieldSpy.mockRestore();
      objectSpy.mockRestore();
    })

    it('Should return a decorated Connection Object', () => {
      new AutoRelayConfig({ orm: () => ORMMock });

      const fieldSpy = jest.spyOn(TGQL, 'Field');
      const objectSpy = jest.spyOn(TGQL, 'ObjectType');

      const objectInnerSpy = jest.fn();
      const fieldInnerSpy = jest.fn();
      fieldSpy.mockImplementation((_a, _b) => {
        return fieldInnerSpy;
      });
      objectSpy.mockImplementation((_a, _b) => {
        return objectInnerSpy;
      });

      const { Connection } = dynamicObjectFactory.makeEdgeConnection("Foo", () => Object)

      expect(Connection).toBeTruthy();

      expect(objectSpy).toHaveBeenCalledWith('FooConnection');

      fieldSpy.mockRestore();
      objectSpy.mockRestore();
    })

  })

  describe('declareFunctionAsRelayInSDL', () => {
    it('Should add typescript reflect data on the function', () => {
      new AutoRelayConfig({ orm: () => ORMMock });
      const { Connection } = dynamicObjectFactory.makeEdgeConnection("", () => Object)

      const Test = class TestClass { };

      dynamicObjectFactory.declareFunctionAsRelayInSDL(Test, 'testFn', '', Connection);
      const meta = Reflect.getMetadata('design:paramtypes', Test, 'testFn');

      expect(meta).toIncludeAllMembers([String, Number, String, Number])
    })

    it('Should decorate the function for the SDL', () => {
      new AutoRelayConfig({ orm: () => ORMMock });
      const { Connection } = dynamicObjectFactory.makeEdgeConnection("", () => Object)
      const fieldSpy = jest.spyOn(TGQL, 'Field');
      const argSpy = jest.spyOn(TGQL, 'Arg');

      const argInnerSpy = jest.fn();
      const fieldInnerSpy = jest.fn();
      fieldSpy.mockImplementation((_a, _b) => {
        return fieldInnerSpy;
      });
      argSpy.mockImplementation((_a, _b) => {
        return argInnerSpy;
      });

      const Test = class TestClass { };
      dynamicObjectFactory.declareFunctionAsRelayInSDL(Test, 'testFn', 'aField', Connection);

      expect(argSpy).toHaveBeenCalledTimes(4)
      expect(argSpy.mock.calls).toIncludeSameMembers([
        ['after', expect.anything(), { nullable: true }],
        ['first', expect.anything(), { nullable: true }],
        ['before', expect.anything(), { nullable: true }],
        ['last', expect.anything(), { nullable: true }]
      ])

      expect(fieldSpy).toHaveBeenCalledTimes(1)
      expect(fieldSpy).toHaveBeenCalledWith(expect.anything(), { name: 'aField' })

      fieldSpy.mockRestore();
      argSpy.mockRestore();
    })
  })
})