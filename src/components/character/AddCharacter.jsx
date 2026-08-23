import { useGLTF } from '@react-three/drei'

function AddCharacter(){
    const { scene } = useGLTF('/models/character/demoChar.glb');

    return (
        <primitive object={scene} position={[0,1.5,0]} scale={1.9}/>
    );
}
useGLTF.preload('/models/character/demoChar.glb');
export default AddCharacter;