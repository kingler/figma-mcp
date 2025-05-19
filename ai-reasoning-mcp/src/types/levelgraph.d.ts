declare module 'levelgraph' {
  import { ClassicLevel } from 'classic-level'; // Compatible with LevelUp

  export interface Triple {
    subject: string;
    predicate: string;
    object: string | number | boolean; // Allow different types for object
    [key: string]: any; // Allow other arbitrary properties like id, confidence, timestamp
  }

  export interface LevelGraph {
    // Type the db property more generically if ClassicLevel isn't directly LevelUp
    // For levelgraph, it expects a LevelUp-compatible store.
    db: any; // ClassicLevel<string, any> is compatible with LevelUp
    get(pattern: Triple, cb: (err: Error | null, triple?: Triple) => void): void;
    get(patterns: Triple[], cb: (err: Error | null, triples?: Triple[]) => void): void;
    put(triple: Triple, cb: (err: Error | null) => void): void;
    put(triples: Triple[], cb: (err: Error | null) => void): void;
    del(triple: Triple, cb: (err: Error | null) => void): void;
    del(triples: Triple[], cb: (err: Error | null) => void): void;
    search(patterns: Triple[], cb: (err: Error | null, result: Triple[]) => void): void;
    search(patterns: Triple[], options: any, cb: (err: Error | null, result: Triple[]) => void): void;
    v(name: string): any; // Variable for query patterns
    generateBlankNode(prefix?: string): string;
    // Add other methods as needed from LevelGraph API, e.g., createWriteStream, close (if exposed)
    close(cb: (err?: Error | null) => void): void; // Levelgraph itself doesn't have close, it's the underlying store
  }

  function levelgraph(db: ClassicLevel<string, any>): LevelGraph;
  export default levelgraph;
} 