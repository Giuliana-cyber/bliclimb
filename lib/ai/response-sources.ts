export type LibraryTraceability = {
  usedFileSearch: boolean;
  sourceNames: string[];
};

type FileCitationAnnotation = {
  type?: string;
  file_id?: string;
  filename?: string;
  file_citation?: {
    file_id?: string;
    filename?: string;
  };
};

function walk(value: unknown, visitor: (item: Record<string, unknown>) => void, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor, seen));
    return;
  }

  const item = value as Record<string, unknown>;
  visitor(item);

  Object.values(item).forEach((nestedValue) => walk(nestedValue, visitor, seen));
}

export function collectFileCitationAnnotations(value: unknown) {
  const annotations: FileCitationAnnotation[] = [];

  walk(value, (item) => {
    if (Array.isArray(item.annotations)) {
      item.annotations.forEach((annotation) => {
        if (
          annotation &&
          typeof annotation === 'object' &&
          (annotation as FileCitationAnnotation).type === 'file_citation'
        ) {
          annotations.push(annotation as FileCitationAnnotation);
        }
      });
    }
  });

  return annotations;
}

export function extractLibraryTraceability(value: unknown): LibraryTraceability {
  let usedFileSearch = false;

  walk(value, (item) => {
    if (item.type === 'file_search_call') {
      usedFileSearch = true;
    }
  });

  const sourceNames = collectFileCitationAnnotations(value)
    .map((annotation) => annotation.filename ?? annotation.file_citation?.filename ?? '')
    .filter(Boolean);

  return {
    usedFileSearch,
    sourceNames: Array.from(new Set(sourceNames))
  };
}
