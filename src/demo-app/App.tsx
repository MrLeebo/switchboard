import React, { useEffect, useState } from "react";
import { addTodo, getTodos, markTodoComplete } from "./apis/todo-apis";
import Button from "./Button";
import Input from "./Input";
import { Todo, User } from "./types";
import cx from "clsx";
import Spinner from "./Spinner";

type Status = "idle" | "loading" | "adding";

type AppProps = {
  user: User;
};

export default function App({ user }: AppProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [todo, setTodo] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTodos() {
      setStatus("loading");
      try {
        const todosResp = await getTodos(user.id);
        setTodos(todosResp);
      } catch (err) {
        setError(err as Error);
      } finally {
        setStatus("idle");
      }
    }
    fetchTodos();
  }, [user.id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setStatus("adding");
      const savedTodo = await addTodo(todo);
      setTodos((currentTodos) => [...currentTodos, savedTodo]);
      setTodo("");
    } catch (err) {
      setError(err as Error);
    } finally {
      setStatus("idle");
    }
  }

  async function markComplete(todoId: number) {
    try {
      // Optimistically mark completed. Don't wait for HTTP call
      setTodos(
        todos.map((todo) => {
          return todo.id === todoId ? { ...todo, completed: true } : todo;
        })
      );
      await markTodoComplete(todoId);
    } catch (err) {
      setError(err as Error);
    }
  }

  if (error) throw error;

  return (
    <main className="grid h-screen place-content-center">
      {status === "loading" ? (
        <Spinner />
      ) : (
        <>
          <h1 className="text-3xl pb-4">Hi {user.name} 👋</h1>

          {todos.length === 0 && (
            <p className="mb-4">Welcome! Start entering your todos below.</p>
          )}

          <form onSubmit={onSubmit}>
            <Input
              id="todo"
              label="What do you need to do?"
              type="text"
              value={todo}
              onChange={(e) => setTodo(e.target.value)}
            />
            <Button
              type="submit"
              className={cx("ml-1", {
                "bg-slate-300": status === "adding",
              })}
            >
              Add{status === "adding" && "ing..."}
            </Button>
          </form>

          {todos.length > 0 && (
            <>
              <h2 className="text-2xl pt-4">Stuff to do</h2>
              <ul>
                {todos.map((t) => (
                  <li key={t.id}>
                    <input
                      type="checkbox"
                      checked={t.completed}
                      className="mr-1"
                      onChange={() => markComplete(t.id)}
                    />
                    {t.todo}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
