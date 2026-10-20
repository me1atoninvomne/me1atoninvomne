/**
 * Imprint (§ 5 DDG, § 18(2) MStV). Every value comes from the company configuration
 * (src/config/company.ts); missing values are shown as placeholders, never invented.
 */
import type { Lang } from "@/i18n/core";
import type { LegalDocFactory } from "../types";

export const IMPRINT_VERSION = "2026-10-20";

const de: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Impressum",
    sections: [
      {
        id: "anbieter",
        title: "Angaben gemäß § 5 DDG",
        blocks: [
          {
            table: {
              head: ["Angabe", "Wert"],
              rows: [
                ["Anbieter", c.name],
                ["Anschrift", c.address],
                ["Vertreten durch", c.representative],
                ["E-Mail", c.email],
                ["Telefon", c.phone],
                ["Registereintrag", c.register],
                ["Umsatzsteuer-ID (§ 27a UStG)", c.vatId],
              ],
            },
          },
        ],
      },
      {
        id: "inhalt",
        title: "Verantwortlich für den Inhalt",
        blocks: [`Verantwortlich nach § 18 Abs. 2 MStV: ${c.contentResponsible}`],
      },
      {
        id: "streitbeilegung",
        title: "Verbraucherstreitbeilegung",
        blocks: [
          "Unser Angebot richtet sich ausschließlich an Unternehmen. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
          "Die frühere EU-Plattform zur Online-Streitbeilegung (OS-Plattform) wurde zum 20. Juli 2025 eingestellt; ein Hinweis darauf ist daher nicht mehr erforderlich.",
          { note: "Vorlage – vom Betreiber zu bestätigen." },
        ],
      },
      {
        id: "weitere",
        title: "Weitere rechtliche Informationen",
        blocks: [
          "[Datenschutzerklärung](/datenschutz) · [Nutzungsbedingungen](/agb) · [Kündigung & Erstattung](/erstattung) · [Cookie-Richtlinie](/cookies) · [Lizenzen & Bildnachweise](/lizenzen) · [Barrierefreiheit](/barrierefreiheit)",
        ],
      },
    ],
  };
};

const en: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Imprint",
    sections: [
      {
        id: "anbieter",
        title: "Information pursuant to § 5 DDG",
        blocks: [
          {
            table: {
              head: ["Item", "Value"],
              rows: [
                ["Provider", c.name],
                ["Address", c.address],
                ["Represented by", c.representative],
                ["E-mail", c.email],
                ["Phone", c.phone],
                ["Register entry", c.register],
                ["VAT ID (§ 27a UStG)", c.vatId],
              ],
            },
          },
        ],
      },
      {
        id: "inhalt",
        title: "Responsible for content",
        blocks: [`Responsible pursuant to § 18(2) MStV: ${c.contentResponsible}`],
      },
      {
        id: "streitbeilegung",
        title: "Consumer dispute resolution",
        blocks: [
          "Our offering is aimed exclusively at businesses. We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
          "The former EU online dispute resolution (ODR) platform was discontinued on 20 July 2025; a reference to it is therefore no longer required.",
          { note: "Template – to be confirmed by the operator." },
        ],
      },
      {
        id: "weitere",
        title: "Further legal information",
        blocks: [
          "[Privacy policy](/datenschutz) · [Terms of use](/agb) · [Cancellation & refunds](/erstattung) · [Cookie policy](/cookies) · [Licences & image credits](/lizenzen) · [Accessibility](/barrierefreiheit)",
        ],
      },
    ],
  };
};

export const imprintDoc: Record<Lang, LegalDocFactory> = { de, en };
