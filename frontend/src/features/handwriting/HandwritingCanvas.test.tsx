import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, fireEvent } from "@testing-library/react";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "./HandwritingCanvas";

describe("HandwritingCanvas", () => {
  it("starts blank and exposes a clear/toDataURL/isBlank handle", () => {
    const ref = createRef<HandwritingCanvasHandle>();
    render(<HandwritingCanvas ref={ref} guideText="A" />);

    expect(ref.current).not.toBeNull();
    expect(ref.current!.isBlank()).toBe(true);

    const dataUrl = ref.current!.toDataURL();
    expect(dataUrl.startsWith("data:image/png")).toBe(true);
  });

  it("marks ink present after a pointer drag and clears it back to blank", () => {
    const ref = createRef<HandwritingCanvasHandle>();
    const { container } = render(<HandwritingCanvas ref={ref} guideText="A" />);

    const canvases = container.querySelectorAll("canvas");
    const inkCanvas = canvases[1];

    fireEvent.pointerDown(inkCanvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(inkCanvas, { clientX: 50, clientY: 50 });
    fireEvent.pointerUp(inkCanvas, { clientX: 50, clientY: 50 });

    expect(ref.current!.isBlank()).toBe(false);

    ref.current!.clear();
    expect(ref.current!.isBlank()).toBe(true);
  });

  it("renders two stacked canvases (guide layer + transparent ink layer)", () => {
    const { container } = render(<HandwritingCanvas guideShape="circle" />);
    expect(container.querySelectorAll("canvas")).toHaveLength(2);
  });
});
