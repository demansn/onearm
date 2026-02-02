export function decodeIfBase64(input) {
    // 1) data:...;base64,...
    let raw = input;
    const comma = raw.indexOf(",");
    if (comma !== -1 && /;base64/i.test(raw.slice(0, comma))) {
        raw = raw.slice(comma + 1);
    }

    // 2) нормализуем
    raw = raw.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");

    // 3) грубая валидация алфавита и паддинга
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) return { ok: false, value: input };
    while (raw.length % 4) raw += "=";

    try {
        const binary = atob(raw);
        // 4) строгая проверка: повторно закодируем и сравним (без хвостовых '=')
        const recoded = btoa(binary).replace(/=+$/, "");
        if (recoded !== raw.replace(/=+$/, "")) return { ok: false, value: input };

        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const text = new TextDecoder("utf-8").decode(bytes);
        return { ok: true, value: text };
    } catch {
        return { ok: false, value: input };
    }
}
