import * as React from 'react';
import { createGlobalStyle } from 'styled-components';

import FONTS from '../constants/fonts';

const Container = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }
  * {
    margin: 0;
  }
  html, body {
    height: 100%;
  }
  body {
    padding-right: 1rem;
    margin-right: -2rem;
    overflow-x: hidden;
    background-color: ${(props) => props.theme.colors.bodyColor};
    -webkit-background-size: 15px 15px;
    background-size: 15px 15px;
    color: ${(props) => props.theme.colors.text};
    font-family: ${FONTS.paraGraphs.fontFamily};
    line-height: 1.5;
    scroll-behavior: smooth;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
    transition: color 350ms ease 0s, background 350ms ease 0s;
    @media (hover: none) and (pointer:coarse){
      padding-right: initial;
      margin-right: 0;
    }
    &:has(.--open-nav){
      overflow: hidden;
    }
    @media print {
      color: #000;
      line-height: normal;
      p, span {
        font-size: 12px;
      }
      p {
        text-align: justify;
      }
    }
  }
  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }
  input, button, textarea, select {
    font: inherit;
  }
  ul, ol {
    padding: 0;
    list-style:none;
  }
  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }
  hr {
    border: 1px solid ${(props) => props.theme.colors.hrColor};
  }
  #root, #___gatsby {
    isolation: isolate;
  }
  ::-webkit-scrollbar {
    width: 1rem;
  }
  ::-webkit-scrollbar-track {
    background-color: ${(props) => props.theme.colors.bodyColor};
  }
  ::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.theme.colors.text};
  }
`

const GlobalStyle = () => {
    return (
        <Container />
    )
}


export default GlobalStyle;
