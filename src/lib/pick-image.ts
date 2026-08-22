/**
 * ONE RELIABLE WAY TO CHOOSE A PICTURE.
 *
 * A file input created and clicked while detached from the document is the
 * classic reason a photo "never appears": mobile Safari and some Android
 * webviews drop the change event, and the element can be collected before the
 * person has finished choosing. So the input is really in the document, kept
 * alive by the promise, and cleaned up only after the choice resolves.
 *
 * It also resets `value` before every open, so picking the SAME picture twice
 * still fires, and it resolves with an empty list when the sheet is dismissed
 * instead of hanging forever.
 */
export function pickImages({ multiple = false }: { multiple?: boolean } = {}): Promise<File[]> {
  if (typeof document === "undefined") return Promise.resolve([]);

  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    /* Present but invisible: it must be in the document to be trustworthy. */
    input.style.position = "fixed";
    input.style.left = "-10000px";
    input.style.top = "0";
    input.style.opacity = "0";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    document.body.appendChild(input);

    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      input.remove();
      resolve(files);
    };

    input.addEventListener("change", () => finish(Array.from(input.files ?? [])));
    /* SOME BROWSERS NEVER SAY "CANCELLED". This one does, where it exists. */
    input.addEventListener("cancel", () => finish([]));

    /*
      Returning to the page without a change event means the sheet was
      dismissed. We wait a beat, because focus can come back a moment BEFORE
      the file list is delivered.
    */
    const onFocus = () => {
      window.setTimeout(() => {
        if (settled) return;
        if (input.files && input.files.length) finish(Array.from(input.files));
        else finish([]);
      }, 700);
    };
    window.setTimeout(() => {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
    }, 0);

    input.value = "";
    input.click();
  });
}

/** The picture as a data URL, or null when nothing usable was chosen. */
export function readImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.startsWith("data:image") ? result : null);
    };
    reader.onerror = () => resolve(null);
    reader.onabort = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * SMALLER, SO THE WORDS ALWAYS SURVIVE. A photo is redrawn before it is ever
 * stored, and the original is never the thing that fills persistent storage.
 */
export async function shrinkImage(dataUrl: string, max = 900): Promise<string> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("bad image"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

/** Choose one picture and get it back ready to position. */
export async function pickOneImage(): Promise<string | null> {
  const [file] = await pickImages();
  if (!file) return null;
  const raw = await readImage(file);
  if (!raw) return null;
  return shrinkImage(raw);
}
