import styled from 'styled-components';

const Button = styled.button`
    padding: 5px;
    border: ${(props) => props.theme.colors.border};
    color: ${(props) => props.theme.colors.text};
`

export default Button;
