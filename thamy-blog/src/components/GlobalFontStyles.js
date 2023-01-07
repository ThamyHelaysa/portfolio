import * as React from 'react'
import { createGlobalStyle } from 'styled-components'

import FONTS from '../constants/fonts';


const Container = createGlobalStyle`

    @font-face {
        font-family: ${FONTS.bigTitle.fontFamily};
        font-weight: ${FONTS.bigTitle.fontWeight};
        font-style: normal;
        src: url(${FONTS.bigTitle.source}) format(${FONTS.bigTitle.forMat});
        font-display: swap;
    }
    @font-face {
        font-family: ${FONTS.paraGraphs.fontFamily};
        font-weight: ${FONTS.paraGraphs.fontWeight};
        font-style: normal;
        src: url(${FONTS.paraGraphs.source}) format(${FONTS.paraGraphs.forMat});
        font-display: swap;
    }
    @font-face {
        font-family: ${FONTS.emphasis.fontFamily};
        font-weight: ${FONTS.emphasis.fontWeight};
        font-style: normal;
        src: url(${FONTS.emphasis.source}) format(${FONTS.emphasis.forMat});
        font-display: swap;
    }

`

const GlobalFontStyle = () => {
    return (
        <Container />
    )
}

export default GlobalFontStyle;
