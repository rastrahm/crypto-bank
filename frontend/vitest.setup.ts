import React from "react";
import "@testing-library/jest-dom/vitest";

// Vitest + jsdom: asegura React en scope para JSX de componentes/tests.
(globalThis as unknown as { React: typeof React }).React = React;
