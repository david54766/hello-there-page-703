import { createFileRoute } from "@tanstack/react-router";
import { Signup } from "./signup";

export const Route = createFileRoute("/register")({ component: Signup });
