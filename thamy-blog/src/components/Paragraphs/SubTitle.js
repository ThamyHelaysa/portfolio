import styled from "styled-components";

const SubTitle = styled.div`
  color: ${(props) => props.theme.colors.text};
  font-family: ${(props) => props.theme.fonts.subTitle.fontFamily};
  font-weight: ${(props) => props.theme.fonts.subTitle.fontWeight};
`

export default SubTitle;
