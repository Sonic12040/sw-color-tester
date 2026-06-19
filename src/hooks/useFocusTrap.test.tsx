import { describe, it, expect } from "vitest";
import { useRef, useState } from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { useFocusTrap } from "./useFocusTrap.js";

function Harness() {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap({
    active,
    containerRef: ref,
    onEscape: () => setActive(false),
    focusKey: active,
  });
  return (
    <div>
      <button onClick={() => setActive(true)}>open</button>
      {active && (
        <div ref={ref} tabIndex={-1} data-testid="trap">
          <button>first</button>
          <button>last</button>
        </div>
      )}
    </div>
  );
}

function activate() {
  const opener = screen.getByText("open");
  opener.focus(); // simulate the user's pre-open focus
  fireEvent.click(opener);
  return opener;
}

describe("useFocusTrap", () => {
  it("moves focus into the container on activate", () => {
    render(<Harness />);
    activate();
    expect(screen.getByTestId("trap").contains(document.activeElement)).toBe(
      true,
    );
  });

  it("wraps Tab and Shift+Tab within the container", () => {
    render(<Harness />);
    activate();
    const buttons = within(screen.getByTestId("trap")).getAllByRole("button");
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("calls onEscape and returns focus to the opener on deactivate", () => {
    render(<Harness />);
    const opener = activate();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("trap")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
