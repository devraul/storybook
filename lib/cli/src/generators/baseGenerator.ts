import { NpmOptions } from '../NpmOptions';
import { StoryFormat, SupportedLanguage, SupportedFrameworks } from '../project_types';
import { getBabelDependencies, copyComponents } from '../helpers';
import { configure } from './configure';
import { JsPackageManager } from '../js-package-manager';

export type GeneratorOptions = {
  language: SupportedLanguage;
  storyFormat: StoryFormat;
};

export interface FrameworkOptions {
  extraPackages?: string[];
  extraAddons?: string[];
  staticDir?: string;
  addScripts?: boolean;
  addComponents?: boolean;
}

export type Generator = (
  packageManager: JsPackageManager,
  npmOptions: NpmOptions,
  options: GeneratorOptions
) => Promise<void>;

const defaultOptions: FrameworkOptions = {
  extraPackages: [],
  extraAddons: [],
  staticDir: undefined,
  addScripts: true,
  addComponents: true,
};

export async function baseGenerator(
  packageManager: JsPackageManager,
  npmOptions: NpmOptions,
  { language }: GeneratorOptions,
  framework: SupportedFrameworks,
  options: FrameworkOptions = defaultOptions
) {
  const { extraAddons, extraPackages, staticDir, addScripts, addComponents } = {
    ...defaultOptions,
    ...options,
  };

  const addons = [
    '@storybook/addon-links',
    '@storybook/addon-actions',
    '@storybook/addon-essentials',
  ];

  const packages = [
    `@storybook/${framework}`,
    ...addons,
    ...extraPackages,
    ...extraAddons,
    // ⚠️ Some addons have peer deps that must be added too, like '@storybook/addon-docs' => 'react-is'
    'react-is',
  ].filter(Boolean);
  const versionedPackages = await packageManager.getVersionedPackages(...packages);

  configure(framework, [...addons, ...extraAddons]);
  if (addComponents) {
    copyComponents(framework, language);
  }

  const packageJson = packageManager.retrievePackageJson();
  const babelDependencies = await getBabelDependencies(packageManager, packageJson);
  packageManager.addDependencies({ ...npmOptions, packageJson }, [
    ...versionedPackages,
    ...babelDependencies,
  ]);

  if (addScripts) {
    packageManager.addStorybookCommandInScripts({
      port: 6006,
      staticFolder: staticDir,
    });
  }
}
