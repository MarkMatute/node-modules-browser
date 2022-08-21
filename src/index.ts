/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import readPkgJson from 'read-package-json';
import axios from 'axios';
import ejs from 'ejs';
import fs from 'fs/promises';
import open from 'open';
import _ from 'lodash';
import emojic from 'emojic';

const currentWorkingDir = process.cwd();

export const readParentPkgJson = async () => {
  try {
    const packageJsonPath = `${currentWorkingDir}/package.json`;

    const parentPkgJsonData: any = await new Promise((resolve, reject) => {
      readPkgJson(
        packageJsonPath,
        console.error,
        false,
        function (err: any, data: any) {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        }
      );
    });
    const { dependencies, devDependencies } = await getDependenciesInfo(
      parentPkgJsonData
    );
    parentPkgJsonData['dependencies'] = dependencies;
    parentPkgJsonData['devDependencies'] = devDependencies;
    parentPkgJsonData.readme = null;
    return parentPkgJsonData;
  } catch (error) {
    return null;
  }
};

export const getDependenciesInfo = async (parentPkgJsonData: any) => {
  const { dependencies = [], devDependencies = [] } = parentPkgJsonData;
  const npmRegistryApi = 'https://registry.npmjs.org/';

  /**
   * Core dependencies
   */
  console.log(`Getting dependencies info[Loading...] ${emojic.whiteCheckMark}`);
  const depKeys = Object.keys(dependencies);
  const getDepsPromises = depKeys.map((dep) =>
    axios.get(`${npmRegistryApi}/${dep}`)
  );
  const depPromiseResults = await Promise.all(getDepsPromises);
  const depAllData = depPromiseResults.map((r) => r.data);
  const finalDeps = depKeys.map((key) => {
    const currentDepVersion = dependencies[key];
    const dataDep = depAllData.find((d) => {
      return d.name === key;
    });

    const currentVersion = currentDepVersion.replace('^', '');
    const currentVersionHome = _.get(
      dataDep.versions[`${currentVersion}`],
      'homepage',
      ''
    );
    const latestVersion = dataDep['dist-tags'].latest;
    const latestVersionHome = _.get(
      dataDep.versions[`${latestVersion}`],
      'homepage',
      ''
    );

    let status = 'text-success';
    if (currentVersion != latestVersion) {
      status = 'text-danger';
    }

    return {
      name: dataDep.name,
      currentVersion: {
        version: currentVersion,
        homepage: currentVersionHome
      },
      latestVersion: {
        version: latestVersion,
        homepage: latestVersionHome
      },
      status
    };
  });

  /**
   * Dev dependencies
   */
  console.log(
    `Getting dev dependencies info[Loading...] ${emojic.whiteCheckMark}`
  );
  const devDepKeys = Object.keys(devDependencies);
  const getDevDepsPromises = devDepKeys.map((dep) =>
    axios.get(`${npmRegistryApi}/${dep}`)
  );
  const devDepPromiseResults = await Promise.all(getDevDepsPromises);
  const devDepAllData = devDepPromiseResults.map((r) => r.data);
  const finalDevDeps = devDepKeys.map((key) => {
    const currentDepVersion = devDependencies[key];
    const dataDep = devDepAllData.find((d) => {
      return d.name === key;
    });

    const currentVersion = currentDepVersion.replace('^', '');
    const currentVersionHome = _.get(
      dataDep.versions[`${currentVersion}`],
      'homepage',
      ''
    );
    const latestVersion = dataDep['dist-tags'].latest;
    const latestVersionHome = _.get(
      dataDep.versions[`${latestVersion}`],
      'homepage',
      ''
    );

    let status = 'text-success';
    if (currentVersion != latestVersion) {
      status = 'text-danger';
    }

    return {
      name: dataDep.name,
      currentVersion: {
        version: currentVersion,
        homepage: currentVersionHome
      },
      latestVersion: {
        version: latestVersion,
        homepage: latestVersionHome
      },
      status
    };
  });

  return {
    dependencies: finalDeps,
    devDependencies: finalDevDeps
  };
};

export const generateHtml = async (packageJson: any) => {
  console.log(`Generating HTML report ${emojic.whiteCheckMark}`);
  const tmpl = `${__dirname}/../node-modules-report.ejs`;
  const out = `${currentWorkingDir}/node-modules-report.html`;
  const html = await ejs.renderFile(tmpl, packageJson, { async: true });
  await fs.writeFile(out, html);
  await open(out);
  console.log(`Opening HTML report ${emojic.whiteCheckMark}`);
};

export const start = async () => {
  console.log(`Reading package.json ${emojic.vulcanSalute}`);
  const packageJson = await readParentPkgJson();
  await generateHtml(packageJson);
  console.log(`Done ${emojic.whiteCheckMark}`);
};
