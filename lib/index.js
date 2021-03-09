const {src, dest, series, parallel, watch} = require('gulp')


const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
// gulp以外的插件
const del = require('del')
const browserSync = require('browser-sync')
const bs = browserSync.create()

// 数据
const cwd = process.cwd()  // 返回当前目录

let config = {
  // 默认配置
  build: {
    src: 'src',
    dist: 'release',
    temp: '.temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

const { src: configSrc, dist, temp, public, paths } = config.build

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config,loadConfig)
} catch (e) {
}

// css
const style = () => {
  return src(paths.styles, { base: configSrc, cwd: configSrc})
  .pipe(plugins.sass( { outputStyle: 'expanded' } )) 
  .pipe(dest(temp))
  .pipe(bs.reload({ stream: true }))
}
// js
const script = () => {
  return src(paths.scripts, { base: configSrc, cwd: configSrc})
  .pipe( plugins.babel( { presets: [require('@babel/preset-env')] } ) )    
  .pipe(dest(temp)) 
  .pipe(bs.reload({ stream: true }))
}
// html
const page = () => {
  return src(paths.pages, { base: configSrc, cwd: configSrc}) // 写入流
  .pipe( plugins.swig( { data: config.data, default: { cache: false} } ))    // 转换流
  .pipe(dest(temp))  // 写入流
  .pipe(bs.reload({ stream: true }))
}
// 图片
const image = () => {
  return src(paths.images, { base: configSrc, cwd: configSrc})
    .pipe(plugins.imagemin())  
    .pipe(dest(dist))
}
// 文字
const font = () => {
  return src(paths.fonts, { base: configSrc, cwd: configSrc})
    .pipe(plugins.imagemin())  
    .pipe(dest(dist))
}
// 额外的任务
const extra = () => {
  return src('**', { base: public, cwd: public})
  return src('public/**', { base: 'public' })
    .pipe(dest(dist))
}
// 清除的任务
const clean = () => {
  return del([dist, temp]) 
}
// 开一个服务器
const serve = () => {
  watch(paths.styles, { cwd: configSrc} ,style)
  watch(paths.scripts,  { cwd: configSrc},script)
  watch(paths.pages,  { cwd: configSrc} ,page)
  watch([
    paths.images,
    paths.fonts,
  ], { cwd: configSrc }, bs.reload)  

  watch( '**', { cwd: public } , bs.reload )
  bs.init({
    notify: false,  
    port: 8080,
    // open: false, 
    // files:'dist/**',  
    server:{
      baseDir: [temp,dist,public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}
// 使用useref
const useref = () => {
  return src(paths.pages, { base:temp, cwd: temp })
  .pipe(plugins.useref({ searchPath: [temp,'.'] }))
  // 针对html css js, 执行不同的操作
  .pipe(plugins.if(/\.js$/, plugins.uglify()))
  .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
  .pipe(plugins.if(/\.html$/, plugins.htmlmin({
    collapseWhitespace: true,  
    minifyCSS: true, 
    minifyJS: true  
  })))
  .pipe(dest(dist))
}

// 重新规划构建过程的步骤
// clean 中添加一个temp
// page style script 中编译结果输出到temp中
// image font extra 并不需要更改， 只是会在build中去做
// serve 中的baseDir 中 dist 改成 temp 
// useref 中 src 去temp中去取文件, dest打包输出到 dist文件中
// useref 中 base:'temp'    searchPath: ['temp','.']
// 删除 release 和 dist 文件夹
// 在build中执行一个组合任务 先执行compile再执行useref
// 执行 yarn gulp build

const compile = parallel(page, style, script)
const build = series(
  clean,
  parallel( 
    series(compile,useref), 
    extra, 
    image, 
    font
  )
) 
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop,
}