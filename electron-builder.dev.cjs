const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'cc.ohmycode.opc.desktop.dev',
  productName: 'Evan超级管家 Dev',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'opc-dsh-desktop-dev',
    productName: 'Evan超级管家 Dev',
    dshDesktopChannel: 'development'
  },
  artifactName: 'opc-desktop-dev-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'opc-desktop-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
