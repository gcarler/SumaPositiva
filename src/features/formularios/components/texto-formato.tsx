/** Limited rich text with React escaping; deliberately does not interpret HTML. */
export function TextoFormato({ texto }: { texto: string }) {
  return (
    <>
      {texto
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        .map((part, i) =>
          part.startsWith("**") ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : part.startsWith("*") ? (
            <em key={i}>{part.slice(1, -1)}</em>
          ) : (
            part
          ),
        )}
    </>
  );
}
