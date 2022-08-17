/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import readPkgJson from 'read-package-json';
import axios from 'axios';
import ejs from 'ejs';
import fs from 'fs/promises';
import open from 'open';
import _ from 'lodash';

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
    const depsInfo = await getDependenciesInfo(parentPkgJsonData);
    parentPkgJsonData['dependencies'] = depsInfo;
    parentPkgJsonData.readme = null;
    return parentPkgJsonData;
  } catch (error) {
    return null;
  }
};

export const getDependenciesInfo = async (parentPkgJsonData: any) => {
  const { dependencies = [] } = parentPkgJsonData;
  const npmRegistryApi = 'https://registry.npmjs.org/';
  const depKeys = Object.keys(dependencies);
  const getDepsPromises = depKeys.map((dep) =>
    axios.get(`${npmRegistryApi}/${dep}`)
  );
  const promiseResults = await Promise.all(getDepsPromises);
  const allData = promiseResults.map((r) => r.data);
  const finalDeps = depKeys.map((key) => {
    const currentDepVersion = dependencies[key];
    const dataDep = allData.find((d) => {
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

  return (parentPkgJsonData['dependencies'] = finalDeps);
};

export const generateHtml = async (packageJson: any) => {
  const tmpl = `${__dirname}/../node-modules-report.ejs`;
  const out = `${currentWorkingDir}/node-modules-report.html`;
  const html = await ejs.renderFile(tmpl, packageJson, { async: true });
  await fs.writeFile(out, html);
  await open(out);
};

export const start = async () => {
  const packageJson = await readParentPkgJson();
  await generateHtml(packageJson);
};
