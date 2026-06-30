import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().default('Equipe LispCentral'),
  }),
});

export const collections = {
  blog: blogCollection,
  docs: defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    }),
  }),
};
