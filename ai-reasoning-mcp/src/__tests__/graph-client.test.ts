import { GraphClient } from '../graph-client'; // Adjust path as necessary
import fs from 'fs-extra'; // For cleaning up DB files
import path from 'path';

const TEST_DB_PATH = './test_levelgraph_db';

describe('GraphClient (LevelGraph)', () => {
  let singleTestClient: GraphClient | null = null; // For tests not in a nested describe

  beforeEach(async () => {
    await fs.remove(TEST_DB_PATH).catch(err => console.warn(`Cleanup failed (beforeEach) for ${TEST_DB_PATH}: ${err.message}`));
  });

  afterEach(async () => {
    if (singleTestClient) {
      await singleTestClient.close();
      singleTestClient = null;
    }
    await fs.remove(TEST_DB_PATH).catch(err => console.warn(`Cleanup failed (afterEach) for ${TEST_DB_PATH}: ${err.message}`));
  });

  it('should initialize LevelGraph database without errors', async () => {
    try {
      singleTestClient = new GraphClient(TEST_DB_PATH);
      await singleTestClient.ready(); 
      expect(singleTestClient.connected).toBe(true);
    } finally {
      // Close is handled in afterEach
    }
  });

  it('should create a database directory upon first write', async () => {
    singleTestClient = new GraphClient(TEST_DB_PATH);
    await singleTestClient.ready();
    try {
      await singleTestClient.createTriple('testSubject', 'testPredicate', 'testObject', { id: 't1' });
    } catch (e) {
      console.warn('Dummy write for directory check failed:', e);
    }
    const exists = await fs.pathExists(TEST_DB_PATH);
    expect(exists).toBe(true);
    // Close is handled in afterEach
  });

  it('should close the database without errors', async () => {
    singleTestClient = new GraphClient(TEST_DB_PATH);
    await singleTestClient.ready();
    await expect(singleTestClient.close()).resolves.not.toThrow();
    singleTestClient = null; // Prevent afterEach from trying to close it again if it was successful
  });

  it('should allow closing multiple times without errors', async () => {
    singleTestClient = new GraphClient(TEST_DB_PATH);
    await singleTestClient.ready();
    await singleTestClient.close(); 
    await expect(singleTestClient.close()).resolves.not.toThrow(); 
    singleTestClient = null; // Prevent afterEach
  });

  describe('createTriple and getTriplesBySubject', () => {
    let client: GraphClient; // This client is specific to this describe block

    beforeEach(async () => {
      await fs.remove(TEST_DB_PATH).catch(err => console.warn(`Cleanup failed (inner beforeEach) for ${TEST_DB_PATH}: ${err.message}`));
      client = new GraphClient(TEST_DB_PATH);
      await client.ready();
    });

    afterEach(async () => {
      if (client) {
        await client.close();
      }
    });

    it('should create a triple and retrieve it by subject', async () => {
      const subject = 'user:123';
      const predicate = 'name';
      const object = 'Alice';
      const props = { id: 'triple1', confidence: 0.95 };

      await client.createTriple(subject, predicate, object, props);

      const triples = await client.getTriplesBySubject(subject);
      expect(triples).toHaveLength(1);
      expect(triples[0]).toMatchObject({
        subject,
        predicate,
        object,
        id: 'triple1',
        confidence: 0.95,
      });
    });

    it('should return multiple triples for the same subject', async () => {
      const subject = 'user:456';
      await client.createTriple(subject, 'email', 'bob@example.com', { id: 't2' });
      await client.createTriple(subject, 'status', 'active', { id: 't3' });

      const triples = await client.getTriplesBySubject(subject);
      expect(triples).toHaveLength(2);
      // Check if both triples are present (order might not be guaranteed by default)
      expect(triples.some(t => t.predicate === 'email' && t.object === 'bob@example.com')).toBe(true);
      expect(triples.some(t => t.predicate === 'status' && t.object === 'active')).toBe(true);
    });

    it('should return an empty array if no triples match the subject', async () => {
      const triples = await client.getTriplesBySubject('nonexistent:subject');
      expect(triples).toHaveLength(0);
    });
  });
}); 