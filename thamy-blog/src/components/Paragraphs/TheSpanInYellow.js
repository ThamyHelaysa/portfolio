import styled from "styled-components";

const TheSpanInYellow = styled.span`
  display: inline-block;
  padding: 0 5px;
  background-color: ${(props) => props.theme.colors.emphaticPProject};
  color: ${(props) => props.theme.colors.emphaticPProjectColor};
`

export default TheSpanInYellow;
