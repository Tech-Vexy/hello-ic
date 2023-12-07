import {
    $query,
    $update,
    Record,
    Variant,
    StableBTreeMap,
    Vec,
    match,
    Result,
    nat64,
    ic,
    Opt,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  /**
   * This type represents a note that can be listed in the notebook.
   */
  type Note = Record<{
    id: string;
    title: string;
    body: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
  }>;
  
  type NotePayload = Record<{
    title: string;
    body: string;
  }>;
  
  type Error = Variant<{
    NotFound: string;
    InvalidNote: string;
  }>;
  
  const notesStorage = new StableBTreeMap<string, Note>(0, 44, 1024);
  
  /**
   * Retrieve all notes
   */
  $query
  export function getNotes(): Result<Vec<Note>, Error> {
    try {
      return Result.Ok<Vec<Note>, Error>(notesStorage.values());
    } catch (error: any) {
      return Result.Err<Vec<Note>, Error>({ InvalidNote: `Failed to retrieve notes: ${error}` });
    }
  }
  
  /**
   * Retrieve a specific note by ID
   */
  $query
  export function getNote(id: string): Result<Note, Error> {
    try {
      if (!id) {
        throw new Error("Invalid id parameter");
      }
  
      const note = notesStorage.get(id);
      return match(note, {
        Some: (n) => Result.Ok<Note, Error>(n),
        None: () => Result.Err<Note, Error>({ NotFound: `The note with id=${id} was not found in the notebook` }),
      });
    } catch (error: any) {
      return Result.Err<Note, Error>({ InvalidNote: `Failed to retrieve note with id=${id}: ${error.message}` });
    }
  }
  
  /**
   * Add a new note
   */
  $update
  export function addNote(payload: NotePayload): Result<Note, Error> {
    try {
      if (!payload || !payload.title || !payload.body) {
        throw new Error("Invalid payload");
      }
  
      const newNote: Note = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,
        title: payload.title,
        body: payload.body,
      };
  
      notesStorage.insert(newNote.id, newNote);
      return Result.Ok<Note, Error>(newNote);
    } catch (error: any) {
      return Result.Err<Note, Error>({ InvalidNote: `Failed to add a new note: ${error.message}` });
    }
  }
  
  /**
   * Update a note
   */
  $update
  export function updateNote(id: string, payload: NotePayload): Result<Note, Error> {
    try {
      if (!id || !payload || !payload.title || !payload.body) {
        throw new Error("Invalid id or payload");
      }
  
      const note = notesStorage.get(id);
      return match(note, {
        Some: (myNote) => {
          const updatedNote: Note = {
            id: myNote.id,
            createdAt: myNote.createdAt,
            updatedAt: Opt.Some(ic.time()),
            title: payload.title,
            body: payload.body,
          };
  
          notesStorage.insert(myNote.id, updatedNote);
          return Result.Ok<Note, Error>(updatedNote);
        },
        None: () => Result.Err<Note, Error>({ NotFound: `Could not update the note with id=${id}. Note was not found` }),
      });
    } catch (error: any) {
      return Result.Err<Note, Error>({ InvalidNote: `Failed to update note with id=${id}: ${error.message}` });
    }
  }
  
  /**
   * Delete a note
   */
  $update
  export function deleteNote(id: string): Result<Note, Error> {
    try {
      if (!id) {
        throw new Error("Invalid id parameter");
      }
  
      const deletedNote = notesStorage.remove(id);
      return match(deletedNote, {
        Some: (d) => Result.Ok<Note, Error>(d),
        None: () => Result.Err<Note, Error>({ NotFound: `Could not delete the note with id=${id}. Note not found in the notebook` }),
      });
    } catch (error: any) {
      return Result.Err<Note, Error>({ InvalidNote: `Failed to delete note with id=${id}: ${error.message}` });
    }
  }
  
  // A workaround to make the uuid package work with Azle
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
  
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
  
      return array;
    },
  };
  