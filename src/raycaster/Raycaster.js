import * as THREE from 'three';
import { Ray } from './Ray.js';
import { Hit } from './Hit.js';

export class Raycaster {

    constructor(origin, direction) {
        this.ray = new Ray(origin, direction);
    }

    setFromCameraAndScreenPosition = function() {

        const ndcCoords = new THREE.Vector2();

        return function(camera, screenPosition, screenDimensions) {
            ndcCoords.x = screenPosition.x / screenDimensions.x * 2.0 - 1.0;
            ndcCoords.y = (screenDimensions.y - screenPosition.y) / screenDimensions.y * 2.0 - 1.0;
            if (camera.isPerspectiveCamera) {
                this.ray.origin.setFromMatrixPosition(camera.matrixWorld);
                this.ray.direction.set(ndcCoords.x, ndcCoords.y, 0.5 ).unproject(camera).sub(this.ray.origin).normalize();
                this.camera = camera;
            } else if (camera.isOrthographicCamera) {
                this.ray.origin.set(screenPosition.x, screenPosition.y,
                                   (camera.near + camera.far) / (camera.near - camera.far)).unproject(camera);
                this.ray.direction.set(0, 0, -1).transformDirection(camera.matrixWorld);
                this.camera = camera;
            } else {
                throw new Error('Raycaster::setFromCameraAndScreenPosition() -> Unsupported camera type');
            }
        };

    }();

    intersectSplatTree(splatTree, outHits = []) {
        if (splatTree.rootNode) {
            this.castRayAtSplatTreeNode(splatTree, splatTree.rootNode, outHits);
        }
        outHits.sort((a, b) => {
            if (a.distance > b.distance) return 1;
            else return -1;
        });
        return outHits;
    }

    castRayAtSplatTreeNode = function() {

        const tempPosition = new THREE.Vector3();
        const tempScale = new THREE.Vector3();
        const tempRotation = new THREE.Quaternion();
        const tempHit = new Hit();

        // Used for raycasting against splat ellipsoid
        /*
        const origin = new THREE.Vector3();
        const tempRotationMatrix = new THREE.Matrix4();
        const tempScaleMatrix = new THREE.Matrix4();
        const tempMatrix = new THREE.Matrix4();
        const tempMatrix3 = new THREE.Matrix3();
        const tempRay = new Ray();
        */

        return function(splatTree, node, outHits = []) {
            if (!this.ray.intersectBox(node.boundingBox)) {
                return;
            }
            if (node.data.indexes && node.data.indexes.length > 0) {
                for (let i = 0; i < node.data.indexes.length; i++) {
                    const splatIndex = node.data.indexes[i];
                    splatTree.splatBuffer.getPosition(splatIndex, tempPosition);
                    splatTree.splatBuffer.getRotation(splatIndex, tempRotation);
                    splatTree.splatBuffer.getScale(splatIndex, tempScale);

                    // Simple approximated sphere intersection
                    const radius = Math.max(Math.max(tempScale.x, tempScale.y), tempScale.z);
                    if (this.ray.intersectSphere(tempPosition, radius, tempHit)) {
                        outHits.push(tempHit.clone());
                    }

                    // Raycast against actual splat ellipsoid ... doesn't actually work as well
                    // as the approximated sphere approach
                    /*
                    tempScaleMatrix.makeScale(tempScale.x, tempScale.y, tempScale.z);
                    tempRotationMatrix.makeRotationFromQuaternion(tempRotation);
                    tempMatrix.copy(tempScaleMatrix).premultiply(tempRotationMatrix).invert();
                    tempMatrix3.setFromMatrix4(tempMatrix);
                    tempRay.origin.copy(this.ray.origin).sub(tempPosition).applyMatrix4(tempMatrix);
                    tempRay.direction.copy(this.ray.direction).transformDirection(tempMatrix).normalize();
                    if (tempRay.intersectSphere(origin, 1.0, tempHit)) {
                        const hitClone = tempHit.clone();
                        tempMatrix.invert();
                        hitClone.origin.applyMatrix4(tempMatrix).add(tempPosition);
                        outHits.push(hitClone);
                    }
                    */

                }
             }
            if (node.children && node.children.length > 0) {
                for (let child of node.children) {
                    this.castRayAtSplatTreeNode(splatTree, child, outHits);
                }
            }
            return outHits;
        };

    }();
}
