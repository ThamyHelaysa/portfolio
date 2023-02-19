import styled from 'styled-components';

import FONTS from '../../constants/fonts';

const TitleH1 = styled.h1`
  display: inline-block;
  background-color: ${(props) => props.theme.colors.titleBg};
  color: ${(props) => props.theme.colors.titleColor};
  font-family: ${FONTS.bigTitle.fontFamily};
  font-size: ${FONTS.bigTitle.fontSize};
  font-weight: ${FONTS.bigTitle.fontWeight};
  line-height: 1;
  @media print {
    font-size: 2rem!important;
  }
`

const TitleH2 = styled.h2`
  display: inline-block;
  background-color: ${(props) => props.theme.colors.titleBg};
  color: ${(props) => props.theme.colors.titleColor};
  font-family: ${FONTS.mediumTitle.fontFamily};
  font-size: ${FONTS.mediumTitle.fontSize};
  font-weight: ${FONTS.mediumTitle.fontWeight};
  line-height: 1;
`

const TitleH3 = styled.h3`
  display: inline-block;
  background-color: ${(props) => props.theme.colors.titleBg};
  color: ${(props) => props.theme.colors.titleColor};
  font-family: ${FONTS.smallTitle.fontFamily};
  font-size: ${FONTS.smallTitle.fontSize};
  font-weight: ${FONTS.smallTitle.fontWeight};
  line-height: 1;
`

export { TitleH1, TitleH2, TitleH3 };
