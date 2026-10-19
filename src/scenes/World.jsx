import Ground from '../components/Ground'
import Reactor from '../components/Reactor'
import EnergySystem from '../components/EnergySystem'
import NeonBot from '../components/NeonBot'



function World() {
  return (
    <>
      <Ground />
      <Reactor />
      <EnergySystem />
      {/* <NeonBot position={[0, 0, 4]} neonColor="#00b4ff" /> */}
    </>
  )
}

export default World