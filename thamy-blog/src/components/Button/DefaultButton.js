import styled from 'styled-components';

const Button = styled.button`
    width: 40px;
    height: 40px;
    padding: 5px;
    background-color: ${(props) => props.theme.colors.bodyColor};
    border: ${(props) => props.theme.colors.border};
    color: ${(props) => props.theme.colors.text};
    cursor: pointer;
`

export default Button;
