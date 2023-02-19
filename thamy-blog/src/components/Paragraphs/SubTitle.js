import styled from "styled-components";

import FONTS from "../../constants/fonts";

const SubTitle = styled.div`
  color: ${(props) => props.theme.colors.text};
  font-family: ${FONTS.subTitle.fontFamily};
  font-weight: ${FONTS.subTitle.fontWeight};
`

export default SubTitle;
