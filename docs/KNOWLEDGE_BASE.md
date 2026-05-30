# Base de conocimiento BilClimb

BilClimb usa `OPENAI_VECTOR_STORE_ID` para consultar documentos con File Search en chat y generación de planes.

## Subir PDFs

Los PDFs no deben guardarse dentro del repo. Súbelos al vector store con:

```bash
node scripts/upload-knowledge-pdfs.mjs "/ruta/al/documento.pdf"
```

Para subir varios:

```bash
node scripts/upload-knowledge-pdfs.mjs "/ruta/Guerreros de la Roca.pdf" "/ruta/Plan de referencia.pdf"
```

El script:

- lee `OPENAI_API_KEY` y `OPENAI_VECTOR_STORE_ID` del entorno o de `.env.local`
- no imprime llaves ni secretos
- imprime solo el prefijo del vector store, nombres de archivos y estado del lote
- no imprime chunks completos del contenido

## Qué documentos conviene subir

- libros de entrenamiento de escalada revisados
- planes reales de referencia con buena estructura
- reglas internas de seguridad y estilo de BilClimb
- documentos propios validados por un coach o fisioterapeuta

Después de subir documentos, regenera el plan para que la generación vuelva a consultar la biblioteca.
