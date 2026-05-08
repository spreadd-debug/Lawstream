// GAP UX-34 (PDF) — Render PDF de un escrito judicial generado a partir
// de un LegalTemplate con valores rellenados. El formato sigue el
// estándar del escrito argentino: A4, márgenes amplios, encabezado con
// la suma del escrito, cuerpo con secciones I-VII y firma al pie.
//
// Uso:
//   import { pdf } from '@react-pdf/renderer';
//   const blob = await pdf(<EscritoPDF titulo="..." contenido="..." />).toBlob();

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const BLACK = '#0F172A';
const GREY  = '#475569';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: BLACK,
    paddingTop: 60,
    paddingBottom: 70,
    paddingHorizontal: 70,
    backgroundColor: '#FFFFFF',
    lineHeight: 1.6,
  },

  // Suma — la primera línea del escrito en mayúsculas, centrada,
  // separada del cuerpo por una línea horizontal.
  suma: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  divider: {
    height: 0.7,
    backgroundColor: '#94A3B8',
    marginBottom: 20,
  },

  // Cuerpo
  paragraph: {
    fontSize: 11,
    marginBottom: 8,
    textAlign: 'justify',
    lineHeight: 1.55,
  },
  // Secciones romanas (I. OBJETO, II. HECHOS, etc.) — detectadas por
  // regex y renderizadas con bold.
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Señor Juez: — saludo destacado.
  saludo: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    marginTop: 4,
    marginBottom: 10,
  },

  // Pie de página: folio + número de página.
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 70,
    right: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: GREY,
  },

  // Espacio para firma al final.
  firmaBlock: {
    marginTop: 36,
    alignItems: 'center',
  },
  firmaLine: {
    width: 220,
    borderTopWidth: 0.7,
    borderTopColor: BLACK,
    paddingTop: 4,
    marginTop: 36,
  },
  firmaText: {
    fontSize: 9,
    color: GREY,
    textAlign: 'center',
  },
});

interface EscritoPDFProps {
  /** Título / suma del escrito (la primera línea en mayúsculas).
   *  Si el contenido ya empieza con la suma, se omite y solo se
   *  pasa el contenido. */
  titulo?: string;
  /** Contenido del escrito ya rellenado (los {{KEY}} reemplazados). */
  contenido: string;
  /** Subtítulo opcional al pie del último párrafo (ej. "SERÁ JUSTICIA"
   *  ya viene en el contenido — esto es para footer adicional). */
  letrado?: string;
}

// Detecta si una línea es un header de sección romana — formato
// típico "I. OBJETO" o "VI. PETITORIO". Devuelve true para esos
// casos para renderizar con bold.
const SECTION_REGEX = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[A-ZÁÉÍÓÚÑ]/;

const isSectionHeader = (line: string): boolean => SECTION_REGEX.test(line.trim());

const isSaludo = (line: string): boolean => /^Señor[/]?a?\s+Juez:?$/i.test(line.trim());

// El contenido viene como string con \n. Lo parseamos en bloques:
// líneas vacías separan párrafos. La primera línea (si está toda en
// mayúsculas) es la "suma" y se renderiza centrada como header.
function parseContenido(contenido: string): { suma?: string; bloques: { tipo: 'paragraph' | 'section' | 'saludo'; texto: string }[] } {
  const lineas = contenido.split(/\r?\n/);
  let suma: string | undefined;
  let startIdx = 0;

  // ¿La primera línea no vacía está toda en mayúsculas? Es la suma.
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].trim();
    if (!l) continue;
    if (l === l.toUpperCase() && l.length > 6) {
      suma = l;
      startIdx = i + 1;
    }
    break;
  }

  // Agrupar líneas restantes en bloques separados por líneas vacías.
  const bloques: { tipo: 'paragraph' | 'section' | 'saludo'; texto: string }[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const texto = buffer.join(' ').trim();
    if (!texto) { buffer = []; return; }
    if (isSectionHeader(texto)) bloques.push({ tipo: 'section', texto });
    else if (isSaludo(texto))    bloques.push({ tipo: 'saludo',  texto });
    else                          bloques.push({ tipo: 'paragraph', texto });
    buffer = [];
  };

  for (let i = startIdx; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.trim() === '') {
      flush();
    } else {
      buffer.push(l);
    }
  }
  flush();

  return { suma, bloques };
}

export const EscritoPDF: React.FC<EscritoPDFProps> = ({ titulo, contenido, letrado }) => {
  const { suma, bloques } = parseContenido(contenido);
  const sumaFinal = titulo || suma;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {sumaFinal && (
          <>
            <Text style={s.suma}>{sumaFinal}</Text>
            <View style={s.divider} />
          </>
        )}

        {bloques.map((b, idx) => {
          if (b.tipo === 'section')  return <Text key={idx} style={s.sectionHeader}>{b.texto}</Text>;
          if (b.tipo === 'saludo')   return <Text key={idx} style={s.saludo}>{b.texto}</Text>;
          return <Text key={idx} style={s.paragraph}>{b.texto}</Text>;
        })}

        {letrado && (
          <View style={s.firmaBlock}>
            <View style={s.firmaLine}>
              <Text style={s.firmaText}>{letrado}</Text>
            </View>
          </View>
        )}

        <View style={s.pageNumber} fixed>
          <Text>{titulo ?? ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
