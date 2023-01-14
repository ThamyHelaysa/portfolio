import * as React from 'react';
import styled from "styled-components";
import { StaticImage } from "gatsby-plugin-image"
import { Link } from 'gatsby';

import { Paragraph } from '../Paragraphs/Paragraph';


const List = styled.ul`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    margin-bottom: 3rem;
`

const Item = styled.li`
    padding: 1rem;
    border: ${(props) => props.theme.colors.border};
`

const StyledLink = styled(Link)`
    color: inherit;
    text-decoration: none;
`

const CardsList = ({ dataList }) => {
    return (
        <List>
            {dataList.map(({name, path, id, desc, image}) => (
                <Item key={id}>
                    <StyledLink to={path}>
                        <StaticImage
                            className='--proj-img'
                            src={image.path}
                            alt={image.name}
                            width={300}
                            height={300}/>
                        <div>
                            <strong>{name}</strong>
                            <Paragraph>{desc}</Paragraph>
                        </div>
                    </StyledLink>
                </Item>
            ))}
        </List>
    )
}

export default CardsList
