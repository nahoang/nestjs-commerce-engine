// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn'
    },
  },
  {
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/**',
                '@nestjs/*',
                '@prisma/**',
                '@prisma/*',
                'class-validator',
                'class-transformer',
              ],
              message:
                'Domain layer must not depend on external frameworks, ORMs, or DTO libraries (@nestjs/*, @prisma/*, class-validator, class-transformer).',
            },
            {
              regex: '.*(/|^)(infrastructure|api)(/.*|$)',
              message:
                'Domain layer must not depend on Infrastructure or API layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/**', '@prisma/*'],
              message:
                'Application layer must depend on repository contracts/ports, not Prisma ORM (@prisma/*).',
            },
            {
              regex: '.*(/|^)(infrastructure|api)(/.*|$)',
              message:
                'Application layer must not depend on Infrastructure or API layers.',
            },
          ],
        },
      ],
    },
  },
);