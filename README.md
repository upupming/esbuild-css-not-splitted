# esbuild-css-not-splitted

## Reproduce

Link: https://github.com/upupming/esbuild-css-not-splitted

To reproduce the problem:

```bash
pnpm i
pnpm build
```

## Explanation

### Problem 1 -- CSS splitting

When use the `splitting` option, esbuild can split dynamic imported JS files to different chunks and corresponding CSS chunks. But the generated CSS files are duplicate.

In this example, we have `main.js` which imports `main.css` and dynamic imported `part1.js` and `part2.js`, in the build result, chunk [part1-P5AYNROG.css](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/part1-P5AYNROG.css) and [part2-4FHQ4OZ4.css](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/part2-4FHQ4OZ4.css) are generated correctly. But the generated [dist/main.css](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/main.css) is duplicate with another two CSS chunks:

```css
/* main.css */
.main {
  color: royalblue;
}

/* part1.css */
.part1 {
  color: red;
}

/* part2.css */
.part2 {
  color: yellow;
}

```

The `part1.css` and `part2.css` are not needed in the `dist/main.css` output. Our expected output of `dist/main.css` should be only the following content instead:

```css
/* main.css */
.main {
  color: royalblue;
}
```

### Problem 2 -- JS/CSS relation

Another problem is that we want to get the information that, in the final build result, which JS file should load which CSS file at the same time. In this example, when loading [dist/part1-U6X4PEEM.js](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/part1-U6X4PEEM.js), we should load [dist/part1-P5AYNROG.css](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/part1-P5AYNROG.css) at the same time. We need the information that [dist/part1-U6X4PEEM.js](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/part1-U6X4PEEM.js) depends on [dist/part1-P5AYNROG.css](https://github.com/upupming/esbuild-css-not-splitted/tree/main/dist/part1-P5AYNROG.css), but we find it is difficult to achieve using the current [metafile result](https://github.com/evanw/esbuild/blob/f93f488759393a1d9fea60ee6b3c206338167151/lib/shared/types.ts#L413). This will be super useful when users are using lazy loaded React components, and it is the way Vite handles `React.lazy` loaded component in the production build. Here is an example build result of Vite, and [here](https://github.com/upupming/vite-react-lazy-example) is a minimal demo project using Vite:

Source code:

```tsx
const Page1 = React.lazy(() => import('./Page1'));
const Page2 = React.lazy(() => import('./Page2'));
```

Built result:

```tsx
const __vitePreload = function preload(baseModule, deps) {
  if (!deps || deps.length === 0) {
    return baseModule();
  }
  return Promise.all(deps.map((dep) => {
    dep = `${base}${dep}`;
    if (dep in seen)
      return;
    seen[dep] = true;
    const isCss = dep.endsWith(".css");
    const cssSelector = isCss ? '[rel="stylesheet"]' : "";
    if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
      return;
    }
    const link = document.createElement("link");
    link.rel = isCss ? "stylesheet" : scriptRel;
    if (!isCss) {
      link.as = "script";
      link.crossOrigin = "";
    }
    link.href = dep;
    document.head.appendChild(link);
    if (isCss) {
      return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", rej);
      });
    }
  })).then(() => baseModule());
};

const Page1 = React.lazy(() => __vitePreload(() => import("./Page1.5e56db5f.js"), true ? ["assets/Page1.5e56db5f.js","assets/Page1.42974316.css","assets/vendor.96c05b7a.js"] : void 0));
const Page2 = React.lazy(() => __vitePreload(() => import("./Page2.27ae5146.js"), true ? ["assets/Page2.27ae5146.js","assets/Page2.9a0edd85.css","assets/vendor.96c05b7a.js"] : void 0));
```

Because Vite uses rollup for production build, it knows that `assets/Page1.5e56db5f.js` depends on `assets/Page1.42974316.css` in the final build.
