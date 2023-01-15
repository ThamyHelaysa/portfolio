import styled from "styled-components";


const Input = styled.input`
    display: inline-block;
    width: 100%;
    height: 40px;
    padding: .275rem 1rem;
    color: ${(props) => props.theme.colors.text};
    background-color: ${(props) => props.theme.colors.bgColor};
    border: ${(props) => props.theme.colors.border};
    box-shadow: none;
    &:focus-visible {
        outline: ${(props) => props.theme.colors.border} currentColor;
    }
`

export default Input
