import { describe, it, expect } from 'vitest';
import { BoardObject, Obstacle, PowerUp, createBoardObject } from './boardObjects.js';

describe('BoardObject', () => {
  it('constructs with correct properties', () => {
    const obj = new BoardObject('40,69.282', 'test', 5);
    expect(obj.id).toBe('test:40,69.282');
    expect(obj.vertexId).toBe('40,69.282');
    expect(obj.type).toBe('test');
    expect(obj.value).toBe(5);
  });

  it('constructs with center vertex ID', () => {
    const obj = new BoardObject('c:0,0', 'test', 3);
    expect(obj.id).toBe('test:c:0,0');
    expect(obj.vertexId).toBe('c:0,0');
  });

  it('onPlayerInteraction returns undefined by default', () => {
    const obj = new BoardObject('40,69.282', 'test', 5);
    expect(obj.onPlayerInteraction({})).toBeUndefined();
  });

  it('getAffectedVertices returns own vertex by default', () => {
    const obj = new BoardObject('40,69.282', 'test', 5);
    expect(obj.getAffectedVertices(new Map())).toEqual(['40,69.282']);
  });
});

describe('Obstacle', () => {
  it('extends BoardObject with type obstacle', () => {
    const obs = new Obstacle('40,69.282', 7);
    expect(obs).toBeInstanceOf(BoardObject);
    expect(obs.type).toBe('obstacle');
    expect(obs.id).toBe('obstacle:40,69.282');
  });

  it('stores value', () => {
    const obs = new Obstacle('40,69.282', 3);
    expect(obs.value).toBe(3);
  });

  it('onPlayerInteraction returns blocked', () => {
    const obs = new Obstacle('40,69.282', 5);
    expect(obs.onPlayerInteraction({})).toEqual({ blocked: true });
  });

  it('getAffectedVertices returns own vertex', () => {
    const obs = new Obstacle('c:2,3', 5);
    expect(obs.getAffectedVertices(new Map())).toEqual(['c:2,3']);
  });
});

describe('PowerUp', () => {
  it('extends BoardObject with type powerup', () => {
    const pu = new PowerUp('40,69.282', 4);
    expect(pu).toBeInstanceOf(BoardObject);
    expect(pu.type).toBe('powerup');
    expect(pu.id).toBe('powerup:40,69.282');
  });

  it('stores value', () => {
    const pu = new PowerUp('40,69.282', 8);
    expect(pu.value).toBe(8);
  });

  it('onPlayerInteraction returns collected with value', () => {
    const pu = new PowerUp('40,69.282', 6);
    expect(pu.onPlayerInteraction({})).toEqual({ collected: true, value: 6 });
  });

  it('getAffectedVertices returns own vertex', () => {
    const pu = new PowerUp('c:1,1', 2);
    expect(pu.getAffectedVertices(new Map())).toEqual(['c:1,1']);
  });
});

describe('createBoardObject', () => {
  it('creates Obstacle for type obstacle', () => {
    const obj = createBoardObject('obstacle', '40,69.282', 5);
    expect(obj).toBeInstanceOf(Obstacle);
    expect(obj.type).toBe('obstacle');
    expect(obj.vertexId).toBe('40,69.282');
    expect(obj.value).toBe(5);
  });

  it('creates PowerUp for type powerup', () => {
    const obj = createBoardObject('powerup', 'c:0,0', 3);
    expect(obj).toBeInstanceOf(PowerUp);
    expect(obj.type).toBe('powerup');
    expect(obj.vertexId).toBe('c:0,0');
    expect(obj.value).toBe(3);
  });

  it('throws for unknown type', () => {
    expect(() => createBoardObject('unknown', '40,69.282', 5))
      .toThrow('Unknown board object type: unknown');
  });
});
